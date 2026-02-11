// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC-4337 Account Abstraction Interfaces (v0.6)
 * @notice Minimal interfaces needed for smart account integration
 */

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

interface IAccount {
    /**
     * @notice Validate user's signature and nonce
     * @param userOp The user operation
     * @param userOpHash Hash of the user operation
     * @param missingAccountFunds Amount of ETH to send to entrypoint
     * @return validationData 0 for success, SIG_VALIDATION_FAILED for failure
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
}

interface IEntryPoint {
    function getNonce(address sender, uint192 key) external view returns (uint256 nonce);
}
