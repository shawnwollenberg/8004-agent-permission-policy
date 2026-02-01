// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PolicyRegistry.sol";
import "../src/IdentityRegistry.sol";

contract PolicyRegistryTest is Test {
    PolicyRegistry public policyRegistry;
    IdentityRegistry public identityRegistry;

    address public owner = address(0x1);
    address public user = address(0x2);

    bytes32 public constant AGENT_ID = keccak256("test-agent-1");
    bytes32 public constant POLICY_HASH = keccak256("policy-content-hash");

    function setUp() public {
        vm.startPrank(owner);

        identityRegistry = new IdentityRegistry();
        policyRegistry = new PolicyRegistry(address(identityRegistry));

        // Register an agent
        identityRegistry.registerAgent(AGENT_ID, '{"name":"Test Agent"}');

        vm.stopPrank();
    }

    function test_CreatePolicy() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);

        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);
        assertEq(policy.owner, owner);
        assertEq(policy.contentHash, POLICY_HASH);
        assertEq(policy.version, 1);
        assertTrue(policy.active);

        vm.stopPrank();
    }

    function test_UpdatePolicy() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);

        bytes32 newHash = keccak256("new-content-hash");
        policyRegistry.updatePolicy(policyId, newHash);

        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);
        assertEq(policy.contentHash, newHash);
        assertEq(policy.version, 2);

        vm.stopPrank();
    }

    function test_UpdatePolicy_NotOwner_Reverts() public {
        vm.startPrank(owner);
        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        vm.stopPrank();

        vm.startPrank(user);
        vm.expectRevert(PolicyRegistry.NotPolicyOwner.selector);
        policyRegistry.updatePolicy(policyId, keccak256("new-hash"));
        vm.stopPrank();
    }

    function test_DeactivatePolicy() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        policyRegistry.deactivatePolicy(policyId);

        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);
        assertFalse(policy.active);

        vm.stopPrank();
    }

    function test_GrantPermission() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);

        uint256 validFrom = block.timestamp;
        uint256 validUntil = block.timestamp + 30 days;

        bytes32 permissionId = policyRegistry.grantPermission(
            policyId,
            AGENT_ID,
            validFrom,
            validUntil
        );

        PolicyRegistry.Permission memory permission = policyRegistry.getPermission(permissionId);
        assertEq(permission.policyId, policyId);
        assertEq(permission.agentId, AGENT_ID);
        assertEq(permission.grantor, owner);
        assertEq(permission.validFrom, validFrom);
        assertEq(permission.validUntil, validUntil);
        assertFalse(permission.revoked);

        vm.stopPrank();
    }

    function test_GrantPermission_AgentNotRegistered_Reverts() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 unregisteredAgent = keccak256("unregistered-agent");

        vm.expectRevert(PolicyRegistry.AgentNotRegistered.selector);
        policyRegistry.grantPermission(policyId, unregisteredAgent, 0, 0);

        vm.stopPrank();
    }

    function test_RevokePermission() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        policyRegistry.revokePermission(permissionId);

        PolicyRegistry.Permission memory permission = policyRegistry.getPermission(permissionId);
        assertTrue(permission.revoked);

        vm.stopPrank();
    }

    function test_IsPermissionValid() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(
            policyId,
            AGENT_ID,
            block.timestamp,
            block.timestamp + 1 days
        );

        assertTrue(policyRegistry.isPermissionValid(permissionId));

        // After expiry
        vm.warp(block.timestamp + 2 days);
        assertFalse(policyRegistry.isPermissionValid(permissionId));

        vm.stopPrank();
    }

    function test_IsPermissionValid_PolicyDeactivated() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        assertTrue(policyRegistry.isPermissionValid(permissionId));

        policyRegistry.deactivatePolicy(policyId);
        assertFalse(policyRegistry.isPermissionValid(permissionId));

        vm.stopPrank();
    }

    function test_GetOwnerPolicies() public {
        vm.startPrank(owner);

        bytes32 policyId1 = policyRegistry.createPolicy(keccak256("hash1"));
        bytes32 policyId2 = policyRegistry.createPolicy(keccak256("hash2"));

        bytes32[] memory policies = policyRegistry.getOwnerPolicies(owner);
        assertEq(policies.length, 2);
        assertEq(policies[0], policyId1);
        assertEq(policies[1], policyId2);

        vm.stopPrank();
    }

    function test_GetAgentPermissions() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permId1 = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);
        bytes32 permId2 = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory perms = policyRegistry.getAgentPermissions(AGENT_ID);
        assertEq(perms.length, 2);
        assertEq(perms[0], permId1);
        assertEq(perms[1], permId2);

        vm.stopPrank();
    }

    function testFuzz_CreatePolicy(bytes32 contentHash) public {
        vm.assume(contentHash != bytes32(0));

        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(contentHash);
        PolicyRegistry.Policy memory policy = policyRegistry.getPolicy(policyId);

        assertEq(policy.contentHash, contentHash);
        assertTrue(policy.active);

        vm.stopPrank();
    }

    function testFuzz_GrantPermission_ValidityPeriod(uint256 validFrom, uint256 duration) public {
        vm.assume(validFrom > 0 && validFrom < type(uint128).max);
        vm.assume(duration > 0 && duration < 365 days);

        uint256 validUntil = validFrom + duration;

        vm.startPrank(owner);
        vm.warp(validFrom - 1);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(
            policyId,
            AGENT_ID,
            validFrom,
            validUntil
        );

        // Before validity
        assertFalse(policyRegistry.isPermissionValid(permissionId));

        // During validity
        vm.warp(validFrom + 1);
        assertTrue(policyRegistry.isPermissionValid(permissionId));

        // After validity
        vm.warp(validUntil + 1);
        assertFalse(policyRegistry.isPermissionValid(permissionId));

        vm.stopPrank();
    }
}
