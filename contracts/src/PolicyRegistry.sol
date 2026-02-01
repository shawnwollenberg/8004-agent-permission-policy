// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC8004.sol";

/**
 * @title PolicyRegistry
 * @notice On-chain storage and management of agent permission policies
 * @dev Implements ERC-8004 compatible policy storage
 */
contract PolicyRegistry {
    struct Policy {
        bytes32 id;
        address owner;
        bytes32 contentHash;      // IPFS hash or keccak256 of policy JSON
        uint256 version;
        uint256 createdAt;
        uint256 updatedAt;
        bool active;
    }

    struct Permission {
        bytes32 id;
        bytes32 policyId;
        bytes32 agentId;
        address grantor;
        uint256 validFrom;
        uint256 validUntil;
        bool revoked;
    }

    // Storage
    mapping(bytes32 => Policy) public policies;
    mapping(bytes32 => Permission) public permissions;
    mapping(address => bytes32[]) public ownerPolicies;
    mapping(bytes32 => bytes32[]) public agentPermissions;

    // ERC-8004 Identity Registry reference
    IERC8004IdentityRegistry public immutable identityRegistry;

    // Events
    event PolicyCreated(bytes32 indexed policyId, address indexed owner, bytes32 contentHash);
    event PolicyUpdated(bytes32 indexed policyId, bytes32 contentHash, uint256 version);
    event PolicyDeactivated(bytes32 indexed policyId);
    event PolicyReactivated(bytes32 indexed policyId);

    event PermissionGranted(
        bytes32 indexed permissionId,
        bytes32 indexed policyId,
        bytes32 indexed agentId,
        address grantor,
        uint256 validFrom,
        uint256 validUntil
    );
    event PermissionRevoked(bytes32 indexed permissionId);

    // Errors
    error PolicyNotFound();
    error PolicyNotActive();
    error NotPolicyOwner();
    error PermissionNotFound();
    error PermissionAlreadyRevoked();
    error AgentNotRegistered();
    error InvalidValidityPeriod();

    constructor(address _identityRegistry) {
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
    }

    /**
     * @notice Create a new policy
     * @param contentHash Hash of the policy content (IPFS CID or keccak256)
     * @return policyId The unique identifier of the created policy
     */
    function createPolicy(bytes32 contentHash) external returns (bytes32 policyId) {
        policyId = keccak256(abi.encodePacked(msg.sender, contentHash, block.timestamp));

        policies[policyId] = Policy({
            id: policyId,
            owner: msg.sender,
            contentHash: contentHash,
            version: 1,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            active: true
        });

        ownerPolicies[msg.sender].push(policyId);

        emit PolicyCreated(policyId, msg.sender, contentHash);
    }

    /**
     * @notice Update an existing policy
     * @param policyId The policy to update
     * @param contentHash New content hash
     */
    function updatePolicy(bytes32 policyId, bytes32 contentHash) external {
        Policy storage policy = policies[policyId];

        if (policy.owner == address(0)) revert PolicyNotFound();
        if (policy.owner != msg.sender) revert NotPolicyOwner();

        policy.contentHash = contentHash;
        policy.version++;
        policy.updatedAt = block.timestamp;

        emit PolicyUpdated(policyId, contentHash, policy.version);
    }

    /**
     * @notice Deactivate a policy
     * @param policyId The policy to deactivate
     */
    function deactivatePolicy(bytes32 policyId) external {
        Policy storage policy = policies[policyId];

        if (policy.owner == address(0)) revert PolicyNotFound();
        if (policy.owner != msg.sender) revert NotPolicyOwner();

        policy.active = false;
        policy.updatedAt = block.timestamp;

        emit PolicyDeactivated(policyId);
    }

    /**
     * @notice Reactivate a policy
     * @param policyId The policy to reactivate
     */
    function reactivatePolicy(bytes32 policyId) external {
        Policy storage policy = policies[policyId];

        if (policy.owner == address(0)) revert PolicyNotFound();
        if (policy.owner != msg.sender) revert NotPolicyOwner();

        policy.active = true;
        policy.updatedAt = block.timestamp;

        emit PolicyReactivated(policyId);
    }

    /**
     * @notice Grant a permission to an agent using a policy
     * @param policyId The policy to use
     * @param agentId The agent receiving the permission
     * @param validFrom Start of validity period
     * @param validUntil End of validity period (0 for no expiry)
     * @return permissionId The unique identifier of the created permission
     */
    function grantPermission(
        bytes32 policyId,
        bytes32 agentId,
        uint256 validFrom,
        uint256 validUntil
    ) external returns (bytes32 permissionId) {
        Policy storage policy = policies[policyId];

        if (policy.owner == address(0)) revert PolicyNotFound();
        if (!policy.active) revert PolicyNotActive();
        if (policy.owner != msg.sender) revert NotPolicyOwner();
        if (!identityRegistry.isAgentActive(agentId)) revert AgentNotRegistered();
        if (validUntil != 0 && validUntil <= validFrom) revert InvalidValidityPeriod();

        permissionId = keccak256(abi.encodePacked(policyId, agentId, msg.sender, block.timestamp));

        permissions[permissionId] = Permission({
            id: permissionId,
            policyId: policyId,
            agentId: agentId,
            grantor: msg.sender,
            validFrom: validFrom == 0 ? block.timestamp : validFrom,
            validUntil: validUntil,
            revoked: false
        });

        agentPermissions[agentId].push(permissionId);

        emit PermissionGranted(permissionId, policyId, agentId, msg.sender, validFrom, validUntil);
    }

    /**
     * @notice Revoke a permission
     * @param permissionId The permission to revoke
     */
    function revokePermission(bytes32 permissionId) external {
        Permission storage permission = permissions[permissionId];

        if (permission.grantor == address(0)) revert PermissionNotFound();
        if (permission.revoked) revert PermissionAlreadyRevoked();
        if (permission.grantor != msg.sender) revert NotPolicyOwner();

        permission.revoked = true;

        emit PermissionRevoked(permissionId);
    }

    /**
     * @notice Check if a permission is currently valid
     * @param permissionId The permission to check
     * @return valid Whether the permission is valid
     */
    function isPermissionValid(bytes32 permissionId) external view returns (bool valid) {
        Permission storage permission = permissions[permissionId];

        if (permission.grantor == address(0)) return false;
        if (permission.revoked) return false;
        if (block.timestamp < permission.validFrom) return false;
        if (permission.validUntil != 0 && block.timestamp > permission.validUntil) return false;

        // Check if the underlying policy is still active
        Policy storage policy = policies[permission.policyId];
        if (!policy.active) return false;

        return true;
    }

    /**
     * @notice Get all permissions for an agent
     * @param agentId The agent to query
     * @return permissionIds Array of permission IDs
     */
    function getAgentPermissions(bytes32 agentId) external view returns (bytes32[] memory) {
        return agentPermissions[agentId];
    }

    /**
     * @notice Get all policies owned by an address
     * @param owner The owner address
     * @return policyIds Array of policy IDs
     */
    function getOwnerPolicies(address owner) external view returns (bytes32[] memory) {
        return ownerPolicies[owner];
    }

    /**
     * @notice Get policy details
     * @param policyId The policy ID
     * @return policy The policy struct
     */
    function getPolicy(bytes32 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    /**
     * @notice Get permission details
     * @param permissionId The permission ID
     * @return permission The permission struct
     */
    function getPermission(bytes32 permissionId) external view returns (Permission memory) {
        return permissions[permissionId];
    }
}
