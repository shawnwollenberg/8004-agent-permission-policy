// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PermissionEnforcer.sol";
import "../src/PolicyRegistry.sol";
import "../src/IdentityRegistry.sol";

contract PermissionEnforcerTest is Test {
    PermissionEnforcer public enforcer;
    PolicyRegistry public policyRegistry;
    IdentityRegistry public identityRegistry;

    address public owner = address(0x1);

    bytes32 public constant AGENT_ID = keccak256("test-agent-1");
    bytes32 public constant POLICY_HASH = keccak256("policy-content-hash");
    bytes32 public constant SWAP_ACTION = keccak256("swap");
    bytes32 public constant TRANSFER_ACTION = keccak256("transfer");

    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant WETH = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    function setUp() public {
        vm.startPrank(owner);

        identityRegistry = new IdentityRegistry();
        policyRegistry = new PolicyRegistry(address(identityRegistry));
        enforcer = new PermissionEnforcer(address(policyRegistry), address(identityRegistry));

        // Register an agent
        identityRegistry.registerAgent(AGENT_ID, '{"name":"Test Agent"}');

        vm.stopPrank();
    }

    function test_ValidateAction_NoPermission() public {
        PermissionEnforcer.ValidationResult memory result = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC)
        );

        assertFalse(result.valid);
    }

    function test_ValidateAction_WithPermission() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        // Set no constraints (allow all)
        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);
        enforcer.setConstraints(permissionId, 0, 0, 0, allowedActions, allowedTokens);

        vm.stopPrank();

        PermissionEnforcer.ValidationResult memory result = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC)
        );

        assertTrue(result.valid);
        assertEq(result.permissionId, permissionId);
    }

    function test_ValidateAction_MaxValuePerTx() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](1);
        allowedActions[0] = SWAP_ACTION;

        address[] memory allowedTokens = new address[](1);
        allowedTokens[0] = address(0); // any token

        enforcer.setConstraints(
            permissionId,
            5000e18,  // max 5000 per tx
            0,
            0,
            allowedActions,
            allowedTokens
        );

        vm.stopPrank();

        // Within limit
        PermissionEnforcer.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(4000e18, USDC)
        );
        assertTrue(result1.valid);

        // Exceeds limit
        PermissionEnforcer.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(6000e18, USDC)
        );
        assertFalse(result2.valid);
    }

    function test_ValidateAction_ActionNotAllowed() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](1);
        allowedActions[0] = SWAP_ACTION;  // only swap allowed

        address[] memory allowedTokens = new address[](0);

        enforcer.setConstraints(permissionId, 0, 0, 0, allowedActions, allowedTokens);

        vm.stopPrank();

        // Swap allowed
        PermissionEnforcer.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC)
        );
        assertTrue(result1.valid);

        // Transfer not allowed
        PermissionEnforcer.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            TRANSFER_ACTION,
            abi.encode(1000e18, USDC)
        );
        assertFalse(result2.valid);
    }

    function test_ValidateAction_TokenNotAllowed() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);

        address[] memory allowedTokens = new address[](1);
        allowedTokens[0] = USDC;  // only USDC allowed

        enforcer.setConstraints(permissionId, 0, 0, 0, allowedActions, allowedTokens);

        vm.stopPrank();

        // USDC allowed
        PermissionEnforcer.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC)
        );
        assertTrue(result1.valid);

        // WETH not allowed
        PermissionEnforcer.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, WETH)
        );
        assertFalse(result2.valid);
    }

    function test_ValidateAction_DailyVolumeLimit() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);

        enforcer.setConstraints(
            permissionId,
            0,
            10000e18,  // max 10000 daily
            0,
            allowedActions,
            allowedTokens
        );

        vm.stopPrank();

        // First action - valid
        PermissionEnforcer.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(5000e18, USDC)
        );
        assertTrue(result1.valid);

        // Record usage
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 5000e18);

        // Second action - still within limit
        PermissionEnforcer.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(4000e18, USDC)
        );
        assertTrue(result2.valid);

        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 4000e18);

        // Third action - exceeds daily limit
        PermissionEnforcer.ValidationResult memory result3 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(2000e18, USDC)
        );
        assertFalse(result3.valid);

        // Next day - limit resets
        vm.warp(block.timestamp + 1 days + 1);

        PermissionEnforcer.ValidationResult memory result4 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(5000e18, USDC)
        );
        assertTrue(result4.valid);
    }

    function test_ValidateAction_TxCountLimit() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);

        enforcer.setConstraints(
            permissionId,
            0,
            0,
            3,  // max 3 txs per day
            allowedActions,
            allowedTokens
        );

        vm.stopPrank();

        for (uint256 i = 0; i < 3; i++) {
            PermissionEnforcer.ValidationResult memory result = enforcer.validateAction(
                AGENT_ID,
                SWAP_ACTION,
                abi.encode(100e18, USDC)
            );
            assertTrue(result.valid);
            enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 100e18);
        }

        // 4th tx - exceeds count limit
        PermissionEnforcer.ValidationResult memory result = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(100e18, USDC)
        );
        assertFalse(result.valid);
    }

    function test_GetUsage() public {
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 1000e18);
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 500e18);

        (uint256 dailyVolume, uint256 txCount) = enforcer.getUsage(AGENT_ID, SWAP_ACTION);

        assertEq(dailyVolume, 1500e18);
        assertEq(txCount, 2);
    }

    function test_GetRemainingQuota() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);

        enforcer.setConstraints(
            permissionId,
            0,
            10000e18,
            10,
            allowedActions,
            allowedTokens
        );

        vm.stopPrank();

        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 3000e18);
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 2000e18);

        (uint256 remainingVolume, uint256 remainingTxCount) = enforcer.getRemainingQuota(
            permissionId,
            AGENT_ID,
            SWAP_ACTION
        );

        assertEq(remainingVolume, 5000e18);
        assertEq(remainingTxCount, 8);
    }

    function testFuzz_DailyVolumeTracking(uint256 amount1, uint256 amount2) public {
        vm.assume(amount1 < type(uint128).max);
        vm.assume(amount2 < type(uint128).max);

        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, amount1);
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, amount2);

        (uint256 dailyVolume, uint256 txCount) = enforcer.getUsage(AGENT_ID, SWAP_ACTION);

        assertEq(dailyVolume, amount1 + amount2);
        assertEq(txCount, 2);
    }
}
