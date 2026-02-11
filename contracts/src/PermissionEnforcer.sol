// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PolicyRegistry.sol";
import "./interfaces/IERC8004.sol";

/**
 * @title PermissionEnforcer
 * @notice Validates agent actions against granted permissions
 * @dev Can be used as a pre-execution check or integrated into protocol contracts
 */
contract PermissionEnforcer is IERC8004ValidationRegistry {
    // Reference to the policy registry
    PolicyRegistry public immutable policyRegistry;
    IERC8004IdentityRegistry public immutable identityRegistry;

    // Track action usage for rate limiting
    struct UsageTracker {
        uint256 dailyVolume;
        uint256 lastResetTimestamp;
        uint256 txCount;
    }

    // agentId => action type hash => usage
    mapping(bytes32 => mapping(bytes32 => UsageTracker)) public agentUsage;

    // Constraint types stored in permission metadata
    struct Constraints {
        uint256 maxValuePerTx;
        uint256 maxDailyVolume;
        uint256 maxTxCount;
        bytes32[] allowedActions;
        address[] allowedTokens;
        address[] allowedProtocols;
        uint256[] allowedChains;
    }

    // permissionId => constraints
    mapping(bytes32 => Constraints) public permissionConstraints;

    // Events
    event ConstraintsSet(bytes32 indexed permissionId);
    event UsageRecorded(bytes32 indexed agentId, bytes32 actionHash, uint256 value);
    event ConstraintViolation(bytes32 indexed agentId, bytes32 permissionId, string reason);

    // Errors
    error PermissionNotValid();
    error ConstraintViolated(string reason);
    error ActionNotAllowed();
    error TokenNotAllowed();
    error ProtocolNotAllowed();
    error ChainNotAllowed();
    error ValueExceedsLimit();
    error DailyVolumeExceeded();
    error TxCountExceeded();

    constructor(address _policyRegistry, address _identityRegistry) {
        policyRegistry = PolicyRegistry(_policyRegistry);
        identityRegistry = IERC8004IdentityRegistry(_identityRegistry);
    }

    /**
     * @notice Set constraints for a permission
     * @param permissionId The permission to configure
     * @param maxValuePerTx Maximum value per transaction
     * @param maxDailyVolume Maximum daily volume
     * @param maxTxCount Maximum transaction count per day
     * @param allowedActions Array of allowed action type hashes
     * @param allowedTokens Array of allowed token addresses
     * @param allowedProtocols Array of allowed protocol addresses
     * @param allowedChains Array of allowed chain IDs
     */
    function setConstraints(
        bytes32 permissionId,
        uint256 maxValuePerTx,
        uint256 maxDailyVolume,
        uint256 maxTxCount,
        bytes32[] calldata allowedActions,
        address[] calldata allowedTokens,
        address[] calldata allowedProtocols,
        uint256[] calldata allowedChains
    ) external {
        PolicyRegistry.Permission memory perm = policyRegistry.getPermission(permissionId);
        require(perm.grantor == msg.sender, "Not permission grantor");

        permissionConstraints[permissionId] = Constraints({
            maxValuePerTx: maxValuePerTx,
            maxDailyVolume: maxDailyVolume,
            maxTxCount: maxTxCount,
            allowedActions: allowedActions,
            allowedTokens: allowedTokens,
            allowedProtocols: allowedProtocols,
            allowedChains: allowedChains
        });

        emit ConstraintsSet(permissionId);
    }

    /**
     * @notice Set constraints (backward compatible - no protocols/chains)
     */
    function setConstraints(
        bytes32 permissionId,
        uint256 maxValuePerTx,
        uint256 maxDailyVolume,
        uint256 maxTxCount,
        bytes32[] calldata allowedActions,
        address[] calldata allowedTokens
    ) external {
        PolicyRegistry.Permission memory perm = policyRegistry.getPermission(permissionId);
        require(perm.grantor == msg.sender, "Not permission grantor");

        address[] memory emptyProtocols = new address[](0);
        uint256[] memory emptyChains = new uint256[](0);

        permissionConstraints[permissionId] = Constraints({
            maxValuePerTx: maxValuePerTx,
            maxDailyVolume: maxDailyVolume,
            maxTxCount: maxTxCount,
            allowedActions: allowedActions,
            allowedTokens: allowedTokens,
            allowedProtocols: emptyProtocols,
            allowedChains: emptyChains
        });

        emit ConstraintsSet(permissionId);
    }

    /**
     * @notice Validate an action for an agent
     * @param agentId The agent attempting the action
     * @param actionHash Hash identifying the action type
     * @param actionData Encoded action parameters (value, token, etc.)
     * @return result The validation result
     */
    function validateAction(
        bytes32 agentId,
        bytes32 actionHash,
        bytes calldata actionData
    ) external override returns (ValidationResult memory result) {
        // Check agent is active
        if (!identityRegistry.isAgentActive(agentId)) {
            return ValidationResult({valid: false, validUntil: 0, permissionId: bytes32(0)});
        }

        // Get agent's permissions
        bytes32[] memory permissionIds = policyRegistry.getAgentPermissions(agentId);

        for (uint256 i = 0; i < permissionIds.length; i++) {
            bytes32 permissionId = permissionIds[i];

            // Check if permission is valid
            if (!policyRegistry.isPermissionValid(permissionId)) {
                continue;
            }

            // Check constraints
            if (_checkConstraints(permissionId, agentId, actionHash, actionData)) {
                PolicyRegistry.Permission memory perm = policyRegistry.getPermission(permissionId);

                result = ValidationResult({
                    valid: true,
                    validUntil: perm.validUntil,
                    permissionId: permissionId
                });

                emit ActionValidated(agentId, actionHash, true);
                return result;
            }
        }

        emit ActionValidated(agentId, actionHash, false);
        return ValidationResult({valid: false, validUntil: 0, permissionId: bytes32(0)});
    }

    /**
     * @notice Record usage after a successful action
     * @param agentId The agent that performed the action
     * @param actionHash The action type hash
     * @param value The value of the action
     */
    function recordUsage(bytes32 agentId, bytes32 actionHash, uint256 value) external {
        UsageTracker storage tracker = agentUsage[agentId][actionHash];

        // Reset daily counters if new day
        if (block.timestamp >= tracker.lastResetTimestamp + 1 days) {
            tracker.dailyVolume = 0;
            tracker.txCount = 0;
            tracker.lastResetTimestamp = block.timestamp - (block.timestamp % 1 days);
        }

        tracker.dailyVolume += value;
        tracker.txCount++;

        emit UsageRecorded(agentId, actionHash, value);
    }

    /**
     * @notice Check constraints for a permission
     * @dev Supports two actionData formats:
     *   - Legacy (64 bytes): abi.encode(uint256 value, address token)
     *   - Extended (128 bytes): abi.encode(uint256 value, address token, address protocol, uint256 chainId)
     */
    function _checkConstraints(
        bytes32 permissionId,
        bytes32 agentId,
        bytes32 actionHash,
        bytes calldata actionData
    ) internal view returns (bool) {
        Constraints storage constraints = permissionConstraints[permissionId];

        // If no constraints set, allow by default
        if (constraints.maxValuePerTx == 0 &&
            constraints.maxDailyVolume == 0 &&
            constraints.maxTxCount == 0 &&
            constraints.allowedActions.length == 0 &&
            constraints.allowedTokens.length == 0 &&
            constraints.allowedProtocols.length == 0 &&
            constraints.allowedChains.length == 0) {
            return true;
        }

        // Check allowed actions
        if (constraints.allowedActions.length > 0) {
            bool actionAllowed = false;
            for (uint256 i = 0; i < constraints.allowedActions.length; i++) {
                if (constraints.allowedActions[i] == actionHash ||
                    constraints.allowedActions[i] == bytes32(0)) { // bytes32(0) = wildcard
                    actionAllowed = true;
                    break;
                }
            }
            if (!actionAllowed) return false;
        }

        // Decode action data to get value and token
        if (actionData.length >= 64) {
            (uint256 value, address token) = abi.decode(actionData, (uint256, address));

            // Check max value per tx
            if (constraints.maxValuePerTx > 0 && value > constraints.maxValuePerTx) {
                return false;
            }

            // Check allowed tokens
            if (constraints.allowedTokens.length > 0) {
                bool tokenAllowed = false;
                for (uint256 i = 0; i < constraints.allowedTokens.length; i++) {
                    if (constraints.allowedTokens[i] == token ||
                        constraints.allowedTokens[i] == address(0)) { // address(0) = any token
                        tokenAllowed = true;
                        break;
                    }
                }
                if (!tokenAllowed) return false;
            }

            // Extended format: check protocol and chain constraints
            if (actionData.length >= 128) {
                (, , address protocol, uint256 chainId) = abi.decode(actionData, (uint256, address, address, uint256));

                // Check allowed protocols
                if (constraints.allowedProtocols.length > 0) {
                    bool protocolAllowed = false;
                    for (uint256 i = 0; i < constraints.allowedProtocols.length; i++) {
                        if (constraints.allowedProtocols[i] == protocol ||
                            constraints.allowedProtocols[i] == address(0)) { // address(0) = any protocol
                            protocolAllowed = true;
                            break;
                        }
                    }
                    if (!protocolAllowed) return false;
                }

                // Check allowed chains
                if (constraints.allowedChains.length > 0) {
                    bool chainAllowed = false;
                    for (uint256 i = 0; i < constraints.allowedChains.length; i++) {
                        if (constraints.allowedChains[i] == chainId ||
                            constraints.allowedChains[i] == 0) { // 0 = any chain
                            chainAllowed = true;
                            break;
                        }
                    }
                    if (!chainAllowed) return false;
                }
            }

            // Check daily volume
            UsageTracker storage tracker = agentUsage[agentId][actionHash];
            uint256 currentDailyVolume = tracker.dailyVolume;

            // Reset if new day
            if (block.timestamp >= tracker.lastResetTimestamp + 1 days) {
                currentDailyVolume = 0;
            }

            if (constraints.maxDailyVolume > 0 && currentDailyVolume + value > constraints.maxDailyVolume) {
                return false;
            }

            // Check tx count
            uint256 currentTxCount = tracker.txCount;
            if (block.timestamp >= tracker.lastResetTimestamp + 1 days) {
                currentTxCount = 0;
            }

            if (constraints.maxTxCount > 0 && currentTxCount >= constraints.maxTxCount) {
                return false;
            }
        }

        return true;
    }

    /**
     * @notice Get current usage for an agent and action
     * @param agentId The agent
     * @param actionHash The action type
     * @return dailyVolume Current daily volume
     * @return txCount Current transaction count
     */
    function getUsage(bytes32 agentId, bytes32 actionHash) external view returns (
        uint256 dailyVolume,
        uint256 txCount
    ) {
        UsageTracker storage tracker = agentUsage[agentId][actionHash];

        // Check if needs reset
        if (block.timestamp >= tracker.lastResetTimestamp + 1 days) {
            return (0, 0);
        }

        return (tracker.dailyVolume, tracker.txCount);
    }

    /**
     * @notice Get remaining quota for an agent permission
     * @param permissionId The permission
     * @param agentId The agent
     * @param actionHash The action type
     * @return remainingVolume Remaining daily volume
     * @return remainingTxCount Remaining transaction count
     */
    function getRemainingQuota(
        bytes32 permissionId,
        bytes32 agentId,
        bytes32 actionHash
    ) external view returns (uint256 remainingVolume, uint256 remainingTxCount) {
        Constraints storage constraints = permissionConstraints[permissionId];
        UsageTracker storage tracker = agentUsage[agentId][actionHash];

        uint256 currentVolume = tracker.dailyVolume;
        uint256 currentCount = tracker.txCount;

        // Reset if new day
        if (block.timestamp >= tracker.lastResetTimestamp + 1 days) {
            currentVolume = 0;
            currentCount = 0;
        }

        remainingVolume = constraints.maxDailyVolume > currentVolume ?
            constraints.maxDailyVolume - currentVolume : 0;
        remainingTxCount = constraints.maxTxCount > currentCount ?
            constraints.maxTxCount - currentCount : 0;
    }
}
