// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PermissionEnforcer.sol";
import "../src/PolicyRegistry.sol";
import "../src/IdentityRegistry.sol";
import "../src/PriceOracle.sol";
import "../src/interfaces/IAggregatorV3.sol";

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

// Mock aggregator for oracle tests in enforcer
contract MockChainlinkFeed is IAggregatorV3 {
    int256 private _price;
    uint8 private _decimals;

    constructor(int256 price_, uint8 decimals_) {
        _price = price_;
        _decimals = decimals_;
    }

    function decimals() external view override returns (uint8) { return _decimals; }

    function latestRoundData() external view override returns (uint80, int256, uint256, uint256, uint80) {
        return (1, _price, block.timestamp, block.timestamp, 1);
    }
}

contract PermissionEnforcerOracleTest is Test {
    PermissionEnforcer public enforcer;
    PolicyRegistry public policyRegistry;
    IdentityRegistry public identityRegistry;
    PriceOracle public oracle;

    address public owner = address(0x1);

    bytes32 public constant AGENT_ID = keccak256("test-agent-oracle");
    bytes32 public constant POLICY_HASH = keccak256("policy-oracle");
    bytes32 public constant SWAP_ACTION = keccak256("swap");

    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant LINK = address(0x514910771AF9Ca656af840dff83E8264EcF986CA);

    function setUp() public {
        vm.startPrank(owner);

        identityRegistry = new IdentityRegistry();
        policyRegistry = new PolicyRegistry(address(identityRegistry));
        enforcer = new PermissionEnforcer(address(policyRegistry), address(identityRegistry));

        // Set up price oracle: ETH=$2000, USDC=$1, LINK=$10
        MockChainlinkFeed ethFeed = new MockChainlinkFeed(2000e8, 8);
        MockChainlinkFeed usdcFeed = new MockChainlinkFeed(1e8, 8);
        MockChainlinkFeed linkFeed = new MockChainlinkFeed(10e8, 8);

        oracle = new PriceOracle(address(ethFeed));
        oracle.setTokenFeed(USDC, address(usdcFeed));
        oracle.setTokenFeed(LINK, address(linkFeed));

        enforcer.setPriceOracle(address(oracle));

        identityRegistry.registerAgent(AGENT_ID, '{"name":"Oracle Test Agent"}');

        vm.stopPrank();
    }

    function test_OracleNormalized_MaxValuePerTx_USDC() public {
        vm.startPrank(owner);
        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory actions = new bytes32[](0);
        address[] memory tokens = new address[](0);
        // Max 1 ETH per tx (in wei)
        enforcer.setConstraints(permissionId, 1 ether, 0, 0, actions, tokens);
        vm.stopPrank();

        // 1000 USDC = 0.5 ETH equivalent → should be allowed
        // Oracle: 1000e6 * 1e8 * 1e8 / (2000e8 * 1e8) = 0.5e6
        // But constraints are in wei (1e18), and USDC amounts are in 6-decimal...
        // The oracle returns amount * tokenPrice / ethPrice (normalized by feed decimals).
        // For USDC: 1000e6 * 1e8 / 2000e8 = 0.5e6 — this is < 1e18, so allowed.
        PermissionEnforcer.ValidationResult memory result = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e6, USDC)
        );
        assertTrue(result.valid);

        // 5000e18 USDC (if stored in 18 decimals) would be 2.5 ETH → should be blocked
        // 5000e18 * 1e8 / 2000e8 = 2.5e18 > 1e18
        PermissionEnforcer.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(5000e18, USDC)
        );
        assertFalse(result2.valid);
    }

    function test_OracleNormalized_DailyVolume_MultiToken() public {
        vm.startPrank(owner);
        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory actions = new bytes32[](0);
        address[] memory tokens = new address[](0);
        // Max 2 ETH daily volume
        enforcer.setConstraints(permissionId, 0, 2 ether, 0, actions, tokens);
        vm.stopPrank();

        // First: 100 LINK at $10 = $1000 = 0.5 ETH → allowed
        PermissionEnforcer.ValidationResult memory r1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(100e18, LINK)
        );
        assertTrue(r1.valid);
        // Record usage with ETH-equivalent value (0.5 ETH)
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 0.5 ether);

        // Second: 300 LINK = $3000 = 1.5 ETH → cumulative 2.0 ETH → allowed
        PermissionEnforcer.ValidationResult memory r2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(300e18, LINK)
        );
        assertTrue(r2.valid);
        enforcer.recordUsage(AGENT_ID, SWAP_ACTION, 1.5 ether);

        // Third: 50 LINK = $500 = 0.25 ETH → cumulative 2.25 ETH → exceeds 2 ETH limit
        PermissionEnforcer.ValidationResult memory r3 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(50e18, LINK)
        );
        assertFalse(r3.valid);
    }

    function test_NoOracle_RawValueComparison() public {
        // Deploy enforcer without oracle
        vm.startPrank(owner);
        IdentityRegistry ir2 = new IdentityRegistry();
        PolicyRegistry pr2 = new PolicyRegistry(address(ir2));
        PermissionEnforcer enforcer2 = new PermissionEnforcer(address(pr2), address(ir2));

        ir2.registerAgent(AGENT_ID, '{"name":"No Oracle Agent"}');
        bytes32 policyId = pr2.createPolicy(POLICY_HASH);
        bytes32 permissionId = pr2.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory actions = new bytes32[](0);
        address[] memory tokens = new address[](0);
        enforcer2.setConstraints(permissionId, 1000e18, 0, 0, actions, tokens);
        vm.stopPrank();

        // Without oracle, raw value is used even for tokens
        PermissionEnforcer.ValidationResult memory r1 = enforcer2.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(500e18, USDC)
        );
        assertTrue(r1.valid);

        PermissionEnforcer.ValidationResult memory r2 = enforcer2.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1500e18, USDC)
        );
        assertFalse(r2.valid);
    }

    function test_NativeEth_PassthroughWithOracle() public {
        vm.startPrank(owner);
        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory actions = new bytes32[](0);
        address[] memory tokens = new address[](0);
        enforcer.setConstraints(permissionId, 1 ether, 0, 0, actions, tokens);
        vm.stopPrank();

        // Native ETH (token=address(0)) should still work as raw value
        PermissionEnforcer.ValidationResult memory r1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(0.5 ether, address(0))
        );
        assertTrue(r1.valid);

        PermissionEnforcer.ValidationResult memory r2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1.5 ether, address(0))
        );
        assertFalse(r2.valid);
    }
}
