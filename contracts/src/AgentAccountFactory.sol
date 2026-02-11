// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AgentSmartAccount.sol";

/**
 * @title AgentAccountFactory
 * @notice CREATE2 factory for deterministic AgentSmartAccount deployment
 * @dev Used by the backend to deploy smart accounts for agents
 */
contract AgentAccountFactory {
    PermissionEnforcer public immutable enforcer;
    address public immutable entryPoint;

    event AccountCreated(address indexed account, address indexed owner, bytes32 indexed agentId);

    constructor(address _enforcer, address _entryPoint) {
        enforcer = PermissionEnforcer(_enforcer);
        entryPoint = _entryPoint;
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
    ) external returns (AgentSmartAccount account) {
        // Combine salt with owner and agentId for uniqueness
        bytes32 combinedSalt = keccak256(abi.encodePacked(owner, agentId, salt));

        // Check if already deployed
        address predicted = getAddress(owner, agentId, salt);
        if (predicted.code.length > 0) {
            return AgentSmartAccount(payable(predicted));
        }

        account = new AgentSmartAccount{salt: combinedSalt}(
            owner,
            agentId,
            address(enforcer),
            entryPoint
        );

        emit AccountCreated(address(account), owner, agentId);
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
                        abi.encode(owner, agentId, address(enforcer), entryPoint)
                    )
                )
            )
        );

        return address(uint160(uint256(hash)));
    }
}
