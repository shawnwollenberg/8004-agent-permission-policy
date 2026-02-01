// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004 Agent Authorization Interface
 * @notice Standard interface for AI agent identity and permission management
 */
interface IERC8004IdentityRegistry {
    struct AgentIdentity {
        address owner;
        bytes32 agentId;
        string metadata;
        uint256 registeredAt;
        bool active;
    }

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, string metadata);
    event AgentDeactivated(bytes32 indexed agentId);
    event AgentReactivated(bytes32 indexed agentId);
    event AgentTransferred(bytes32 indexed agentId, address indexed from, address indexed to);

    function registerAgent(bytes32 agentId, string calldata metadata) external;
    function deactivateAgent(bytes32 agentId) external;
    function reactivateAgent(bytes32 agentId) external;
    function transferAgent(bytes32 agentId, address newOwner) external;
    function getAgent(bytes32 agentId) external view returns (AgentIdentity memory);
    function isAgentActive(bytes32 agentId) external view returns (bool);
    function getAgentOwner(bytes32 agentId) external view returns (address);
}

interface IERC8004ValidationRegistry {
    struct ValidationResult {
        bool valid;
        uint256 validUntil;
        bytes32 permissionId;
    }

    event ActionValidated(bytes32 indexed agentId, bytes32 indexed actionHash, bool allowed);

    function validateAction(
        bytes32 agentId,
        bytes32 actionHash,
        bytes calldata actionData
    ) external returns (ValidationResult memory);
}
