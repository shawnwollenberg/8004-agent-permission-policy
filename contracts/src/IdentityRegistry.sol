// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC8004.sol";

/**
 * @title IdentityRegistry
 * @notice Registry for AI agent identities
 * @dev Implements IERC8004IdentityRegistry for agent management
 */
contract IdentityRegistry is IERC8004IdentityRegistry {
    mapping(bytes32 => AgentIdentity) private agents;
    mapping(address => bytes32[]) private ownerAgents;

    error AgentAlreadyExists();
    error AgentNotFound();
    error NotAgentOwner();
    error AgentAlreadyActive();
    error AgentAlreadyInactive();

    /**
     * @notice Register a new agent
     * @param agentId Unique identifier for the agent
     * @param metadata Agent metadata (JSON string with name, description, etc.)
     */
    function registerAgent(bytes32 agentId, string calldata metadata) external override {
        if (agents[agentId].owner != address(0)) revert AgentAlreadyExists();

        agents[agentId] = AgentIdentity({
            owner: msg.sender,
            agentId: agentId,
            metadata: metadata,
            registeredAt: block.timestamp,
            active: true
        });

        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, metadata);
    }

    /**
     * @notice Deactivate an agent
     * @param agentId The agent to deactivate
     */
    function deactivateAgent(bytes32 agentId) external override {
        AgentIdentity storage agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (agent.owner != msg.sender) revert NotAgentOwner();
        if (!agent.active) revert AgentAlreadyInactive();

        agent.active = false;

        emit AgentDeactivated(agentId);
    }

    /**
     * @notice Reactivate an agent
     * @param agentId The agent to reactivate
     */
    function reactivateAgent(bytes32 agentId) external override {
        AgentIdentity storage agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (agent.owner != msg.sender) revert NotAgentOwner();
        if (agent.active) revert AgentAlreadyActive();

        agent.active = true;

        emit AgentReactivated(agentId);
    }

    /**
     * @notice Transfer agent ownership
     * @param agentId The agent to transfer
     * @param newOwner The new owner address
     */
    function transferAgent(bytes32 agentId, address newOwner) external override {
        AgentIdentity storage agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (agent.owner != msg.sender) revert NotAgentOwner();

        address oldOwner = agent.owner;
        agent.owner = newOwner;

        // Remove from old owner's list
        bytes32[] storage oldOwnerAgents = ownerAgents[oldOwner];
        for (uint256 i = 0; i < oldOwnerAgents.length; i++) {
            if (oldOwnerAgents[i] == agentId) {
                oldOwnerAgents[i] = oldOwnerAgents[oldOwnerAgents.length - 1];
                oldOwnerAgents.pop();
                break;
            }
        }

        // Add to new owner's list
        ownerAgents[newOwner].push(agentId);

        emit AgentTransferred(agentId, oldOwner, newOwner);
    }

    /**
     * @notice Get agent details
     * @param agentId The agent ID
     * @return The agent identity struct
     */
    function getAgent(bytes32 agentId) external view override returns (AgentIdentity memory) {
        return agents[agentId];
    }

    /**
     * @notice Check if an agent is active
     * @param agentId The agent ID
     * @return Whether the agent is active
     */
    function isAgentActive(bytes32 agentId) external view override returns (bool) {
        return agents[agentId].active;
    }

    /**
     * @notice Get the owner of an agent
     * @param agentId The agent ID
     * @return The owner address
     */
    function getAgentOwner(bytes32 agentId) external view override returns (address) {
        return agents[agentId].owner;
    }

    /**
     * @notice Get all agents owned by an address
     * @param owner The owner address
     * @return Array of agent IDs
     */
    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }

    /**
     * @notice Update agent metadata
     * @param agentId The agent ID
     * @param metadata New metadata
     */
    function updateMetadata(bytes32 agentId, string calldata metadata) external {
        AgentIdentity storage agent = agents[agentId];
        if (agent.owner == address(0)) revert AgentNotFound();
        if (agent.owner != msg.sender) revert NotAgentOwner();

        agent.metadata = metadata;
    }
}
