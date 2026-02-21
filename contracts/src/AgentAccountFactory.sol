// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentSmartAccount.sol";
import "./GuardrailFeeManager.sol";

/**
 * @title AgentAccountFactory
 * @notice CREATE2 factory for deterministic AgentSmartAccount deployment
 * @dev Used by the backend to deploy smart accounts for agents. Charges a creation fee.
 */
contract AgentAccountFactory {
    PermissionEnforcer public immutable enforcer;
    address public immutable entryPoint;
    GuardrailFeeManager public immutable feeManager;

    event AccountCreated(address indexed account, address indexed owner, bytes32 indexed agentId);
    event CreationFeePaid(address indexed account, uint256 fee);

    error InsufficientCreationFee(uint256 required, uint256 provided);
    error RefundFailed();
    error FeeTransferFailed();

    constructor(address _enforcer, address _entryPoint, address _feeManager) {
        enforcer = PermissionEnforcer(_enforcer);
        entryPoint = _entryPoint;
        feeManager = GuardrailFeeManager(_feeManager);
    }

    /**
     * @notice Deploy a new AgentSmartAccount using CREATE2
     * @param owner The signer EOA that controls the account
     * @param agentId The agent's identifier
     * @param salt A salt for deterministic deployment
     * @return account The deployed account address
     */
    function createAccount(
        address owner,
        bytes32 agentId,
        bytes32 salt
    ) external payable returns (AgentSmartAccount account) {
        // Combine salt with owner and agentId for uniqueness
        bytes32 combinedSalt = keccak256(abi.encodePacked(owner, agentId, salt));

        // Check if already deployed (idempotent) — refund any msg.value
        address predicted = getAddress(owner, agentId, salt);
        if (predicted.code.length > 0) {
            if (msg.value > 0) {
                (bool refunded, ) = payable(msg.sender).call{value: msg.value}("");
                if (!refunded) revert RefundFailed();
            }
            return AgentSmartAccount(payable(predicted));
        }

        // Check creation fee
        uint256 requiredFee = feeManager.getCreationFeeWei();
        if (msg.value < requiredFee) {
            revert InsufficientCreationFee(requiredFee, msg.value);
        }

        account = new AgentSmartAccount{salt: combinedSalt}(
            owner,
            agentId,
            address(enforcer),
            entryPoint,
            address(feeManager)
        );

        // Send creation fee to fee collector
        address collector = feeManager.feeCollector();
        (bool sent, ) = payable(collector).call{value: requiredFee}("");
        if (!sent) revert FeeTransferFailed();

        // Refund excess
        uint256 excess = msg.value - requiredFee;
        if (excess > 0) {
            (bool refunded, ) = payable(msg.sender).call{value: excess}("");
            if (!refunded) revert RefundFailed();
        }

        emit AccountCreated(address(account), owner, agentId);
        emit CreationFeePaid(address(account), requiredFee);
    }

    /**
     * @notice Get the current creation fee in wei
     * @return The creation fee amount in wei
     */
    function getCreationFee() external view returns (uint256) {
        return feeManager.getCreationFeeWei();
    }

    /**
     * @notice Compute the address of a smart account without deploying
     * @param owner The signer EOA
     * @param agentId The agent's identifier
     * @param salt A salt for deterministic deployment
     * @return The predicted address
     */
    function getAddress(
        address owner,
        bytes32 agentId,
        bytes32 salt
    ) public view returns (address) {
        bytes32 combinedSalt = keccak256(abi.encodePacked(owner, agentId, salt));

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                combinedSalt,
                keccak256(
                    abi.encodePacked(
                        type(AgentSmartAccount).creationCode,
                        abi.encode(owner, agentId, address(enforcer), entryPoint, address(feeManager))
                    )
                )
            )
        );

        return address(uint160(uint256(hash)));
    }
}
