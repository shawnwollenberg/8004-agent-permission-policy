// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC4337.sol";
import "./PermissionEnforcer.sol";
import "./GuardrailFeeManager.sol";

/**
 * @title AgentSmartAccount
 * @notice ERC-4337 compatible smart account that enforces agent permissions on-chain
 * @dev Calls PermissionEnforcer.validateAction during validateUserOp to reject policy violations.
 *      Deducts transfer fees on outbound ETH transfers via GuardrailFeeManager.
 */
contract AgentSmartAccount is IAccount {
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    address public immutable owner;
    bytes32 public immutable agentId;
    PermissionEnforcer public immutable enforcer;
    address public immutable entryPoint;
    GuardrailFeeManager public immutable feeManager;

    event Executed(address indexed target, uint256 value, uint256 fee, bytes data);
    event ExecutedBatch(uint256 count, uint256 totalFees);
    event EnforcementResult(bytes32 indexed agentId, bytes32 actionHash, bool allowed);

    error NotAuthorized();
    error ExecutionFailed();
    error FeeTransferFailed();

    modifier onlyOwnerOrEntryPoint() {
        if (msg.sender != owner && msg.sender != entryPoint) revert NotAuthorized();
        _;
    }

    constructor(address _owner, bytes32 _agentId, address _enforcer, address _entryPoint, address _feeManager) {
        owner = _owner;
        agentId = _agentId;
        enforcer = PermissionEnforcer(_enforcer);
        entryPoint = _entryPoint;
        feeManager = GuardrailFeeManager(_feeManager);
    }

    /**
     * @notice Validate a UserOperation — checks ECDSA signature and enforces permissions
     * @param userOp The user operation to validate
     * @param userOpHash Hash of the user operation (signed by owner)
     * @param missingAccountFunds ETH to prefund the entrypoint
     * @return validationData 0 if valid, SIG_VALIDATION_FAILED if invalid
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        // Only entrypoint can call validateUserOp
        if (msg.sender != entryPoint) revert NotAuthorized();

        // Verify ECDSA signature from owner
        if (!_validateSignature(userOpHash, userOp.signature)) {
            return SIG_VALIDATION_FAILED;
        }

        // Extract target call from callData and enforce permissions
        if (userOp.callData.length >= 4) {
            bytes4 selector = bytes4(userOp.callData[:4]);

            // Check if this is an execute call
            if (selector == this.execute.selector && userOp.callData.length >= 68) {
                (address target, uint256 value, ) = abi.decode(userOp.callData[4:], (address, uint256, bytes));

                // Build actionData and validate against enforcer
                bytes32 actionHash = _getActionHash(target, selector);
                bytes memory actionData = abi.encode(value, target, address(0), block.chainid);

                IERC8004ValidationRegistry.ValidationResult memory result = enforcer.validateAction(
                    agentId, actionHash, actionData
                );

                emit EnforcementResult(agentId, actionHash, result.valid);

                if (!result.valid) {
                    return SIG_VALIDATION_FAILED;
                }
            }
        }

        // Prefund entrypoint if needed
        if (missingAccountFunds > 0) {
            (bool success, ) = payable(entryPoint).call{value: missingAccountFunds}("");
            (success); // ignore failure (entrypoint will verify)
        }

        return 0;
    }

    /**
     * @notice Execute a call from this account
     * @dev If value > 0, deducts a transfer fee and sends it to the fee collector
     * @param target The target contract address
     * @param value ETH value to send
     * @param data Calldata to send
     */
    function execute(address target, uint256 value, bytes calldata data) external onlyOwnerOrEntryPoint {
        uint256 fee = 0;
        if (value > 0) {
            fee = feeManager.calculateTransferFee(value);
            if (fee > 0) {
                address collector = feeManager.feeCollector();
                (bool feeSent, ) = payable(collector).call{value: fee}("");
                if (!feeSent) revert FeeTransferFailed();
            }
        }

        uint256 sendValue = value - fee;
        (bool success, ) = target.call{value: sendValue}(data);
        if (!success) revert ExecutionFailed();
        emit Executed(target, value, fee, data);
    }

    /**
     * @notice Execute a batch of calls
     * @dev Each sub-call with value > 0 is charged a transfer fee
     * @param targets Array of target addresses
     * @param values Array of ETH values
     * @param datas Array of calldatas
     */
    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyOwnerOrEntryPoint {
        require(targets.length == values.length && values.length == datas.length, "length mismatch");

        uint256 totalFees = 0;
        for (uint256 i = 0; i < targets.length; i++) {
            uint256 fee = 0;
            if (values[i] > 0) {
                fee = feeManager.calculateTransferFee(values[i]);
                if (fee > 0) {
                    address collector = feeManager.feeCollector();
                    (bool feeSent, ) = payable(collector).call{value: fee}("");
                    if (!feeSent) revert FeeTransferFailed();
                    totalFees += fee;
                }
            }

            uint256 sendValue = values[i] - fee;
            (bool success, ) = targets[i].call{value: sendValue}(datas[i]);
            if (!success) revert ExecutionFailed();
        }
        emit ExecutedBatch(targets.length, totalFees);
    }

    /**
     * @notice Derive an action hash from target address and function selector
     */
    function _getActionHash(address target, bytes4 selector) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(target, selector));
    }

    /**
     * @notice Validate ECDSA signature
     */
    function _validateSignature(bytes32 hash, bytes memory signature) internal view returns (bool) {
        if (signature.length != 65) return false;

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        if (v < 27) v += 27;

        // Recover signer from eth_sign prefixed hash
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address recovered = ecrecover(prefixedHash, v, r, s);

        return recovered == owner;
    }

    receive() external payable {}
}
