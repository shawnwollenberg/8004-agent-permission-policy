// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Recovery
 * @notice Emergency recovery contract used via EIP-7702 delegation.
 *
 * HOW IT WORKS:
 *   The compromised bot EOA delegates to this contract via EIP-7702.
 *   This contract's code then runs IN THE CONTEXT of the bot EOA — so
 *   outgoing calls (like execute()) see msg.sender == bot EOA == owner.
 *   That satisfies the onlyOwnerOrEntryPoint modifier on AgentSmartAccount
 *   without going through validateUserOp (no permission enforcement).
 *
 * USAGE:
 *   1. Deploy this contract (safe wallet pays).
 *   2. Sign an EIP-7702 authorization with the bot private key pointing here.
 *   3. Safe wallet submits a Type 4 transaction that sets the delegation
 *      and calls drain() in the same transaction.
 */

interface ISmartAccount {
    function execute(address target, uint256 value, bytes calldata data) external;
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Recovery {
    /**
     * @notice Drain all USDC and ETH from the smart account to the safe address.
     * @dev Runs as the bot EOA via EIP-7702 delegation, so msg.sender == bot EOA == owner.
     * @param smartAccount The AgentSmartAccount to drain
     * @param safe         The safe address to send funds to
     * @param usdc         The USDC token contract address
     */
    function drain(
        address smartAccount,
        address payable safe,
        address usdc
    ) external {
        ISmartAccount sa = ISmartAccount(smartAccount);

        // ── Transfer USDC ──
        // value=0 so no fee logic is triggered in execute().
        uint256 usdcBal = IERC20(usdc).balanceOf(smartAccount);
        if (usdcBal > 0) {
            sa.execute(
                usdc,
                0,
                abi.encodeWithSignature("transfer(address,uint256)", safe, usdcBal)
            );
        }

        // ── Transfer ETH ──
        // execute() deducts a GuardrailFeeManager transfer fee for value>0.
        // The fee manager may call a price oracle that could revert if not
        // configured on this chain. We try/catch so USDC is always rescued
        // even if the ETH transfer fails.
        uint256 ethBal = smartAccount.balance;
        if (ethBal > 0) {
            try sa.execute(safe, ethBal, "") {
                // success — all ETH sent (minus any transfer fee)
            } catch {
                // Fee manager likely failed (oracle not configured on this chain).
                // Send 99.9% of the ETH directly via execute() with value just under balance.
                // The 0.1% difference covers any fee manager rounding edge cases.
                uint256 reducedAmount = ethBal * 999 / 1000;
                if (reducedAmount > 0) {
                    try sa.execute(safe, reducedAmount, "") {
                        // partial ETH rescued
                    } catch {
                        // Both attempts failed — ETH stays in smart account.
                        // USDC is already rescued above.
                    }
                }
            }
        }
    }
}
