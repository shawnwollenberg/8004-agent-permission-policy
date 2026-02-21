// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentSmartAccount.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PermissionEnforcer.sol";
import "../src/PolicyRegistry.sol";
import "../src/IdentityRegistry.sol";
import "../src/PriceOracle.sol";
import "../src/GuardrailFeeManager.sol";
import "../src/interfaces/IAggregatorV3.sol";

contract MockFeed is IAggregatorV3 {
    int256 private _price;
    uint8 private _decimals;
    uint256 private _updatedAt;

    constructor(int256 price_, uint8 decimals_) {
        _price = price_;
        _decimals = decimals_;
        _updatedAt = block.timestamp;
    }

    function setPrice(int256 price_) external {
        _price = price_;
        _updatedAt = block.timestamp;
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, _price, block.timestamp, _updatedAt, 1);
    }
}

contract AgentSmartAccountTest is Test {
    AgentAccountFactory public factory;
    PermissionEnforcer public enforcer;
    PolicyRegistry public policyRegistry;
    IdentityRegistry public identityRegistry;
    PriceOracle public oracle;
    GuardrailFeeManager public feeManager;
    MockFeed public ethUsdFeed;

    address public owner;
    uint256 public ownerKey;
    address public entryPoint = address(0xEE);
    address public feeCollector = address(0xFEE);

    bytes32 public constant AGENT_ID = keccak256("smart-agent-1");
    bytes32 public constant POLICY_HASH = keccak256("policy-content");
    bytes32 public constant SWAP_ACTION = keccak256("swap");

    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant UNISWAP = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    // Computed creation fee: $10 at $2000/ETH = 0.005 ETH
    uint256 public constant CREATION_FEE = 0.005 ether;

    function setUp() public {
        // Generate owner key pair
        ownerKey = 0xABCD;
        owner = vm.addr(ownerKey);

        // Deploy price oracle with ETH/USD = $2000
        ethUsdFeed = new MockFeed(2000e8, 8);
        oracle = new PriceOracle(address(ethUsdFeed));

        // Configure USDC feed ($1) so constraint tests that use USDC token address work
        MockFeed usdcFeed = new MockFeed(1e8, 8);
        oracle.setTokenFeed(USDC, address(usdcFeed));

        vm.startPrank(owner);

        identityRegistry = new IdentityRegistry();
        policyRegistry = new PolicyRegistry(address(identityRegistry));
        enforcer = new PermissionEnforcer(address(policyRegistry), address(identityRegistry));
        enforcer.setPriceOracle(address(oracle));

        // Deploy FeeManager: $10 creation, 10bps transfer, $100 cap
        feeManager = new GuardrailFeeManager(
            address(oracle),
            feeCollector,
            10_000000,   // $10
            10,          // 10 bps
            100_000000   // $100 cap
        );

        factory = new AgentAccountFactory(address(enforcer), entryPoint, address(feeManager));

        // Register agent
        identityRegistry.registerAgent(AGENT_ID, '{"name":"Smart Agent"}');

        vm.stopPrank();
    }

    // --- Helper to create account with fee ---

    function _createAccount(bytes32 salt) internal returns (AgentSmartAccount) {
        return factory.createAccount{value: CREATION_FEE}(owner, AGENT_ID, salt);
    }

    // --- Factory tests ---

    function test_FactoryCreateAccount() public {
        bytes32 salt = keccak256("salt1");
        address predicted = factory.getAddress(owner, AGENT_ID, salt);

        AgentSmartAccount account = _createAccount(salt);
        assertEq(address(account), predicted);
        assertEq(account.owner(), owner);
        assertEq(account.agentId(), AGENT_ID);
        assertEq(account.entryPoint(), entryPoint);
    }

    function test_FactoryIdempotent() public {
        bytes32 salt = keccak256("salt1");
        AgentSmartAccount account1 = _createAccount(salt);
        // Second call should return same address and refund msg.value
        uint256 balBefore = address(this).balance;
        AgentSmartAccount account2 = factory.createAccount{value: CREATION_FEE}(owner, AGENT_ID, salt);
        uint256 balAfter = address(this).balance;
        assertEq(address(account1), address(account2));
        // Should have been refunded
        assertEq(balAfter, balBefore);
    }

    function test_FactoryIdempotent_NoFee() public {
        bytes32 salt = keccak256("salt1");
        _createAccount(salt);
        // Second call with 0 msg.value should also work
        AgentSmartAccount account2 = factory.createAccount{value: 0}(owner, AGENT_ID, salt);
        assertEq(account2.owner(), owner);
    }

    function test_FactoryDeterministicAddress() public {
        bytes32 salt = keccak256("salt1");
        address predicted = factory.getAddress(owner, AGENT_ID, salt);

        // Different salt produces different address
        address predicted2 = factory.getAddress(owner, AGENT_ID, keccak256("salt2"));
        assertTrue(predicted != predicted2);

        // Same params always produce same address
        address predicted3 = factory.getAddress(owner, AGENT_ID, salt);
        assertEq(predicted, predicted3);
    }

    function test_FactoryCreateAccount_InsufficientFee() public {
        bytes32 salt = keccak256("salt1");
        vm.expectRevert(
            abi.encodeWithSelector(
                AgentAccountFactory.InsufficientCreationFee.selector,
                CREATION_FEE,
                CREATION_FEE - 1
            )
        );
        factory.createAccount{value: CREATION_FEE - 1}(owner, AGENT_ID, salt);
    }

    function test_FactoryCreateAccount_RefundsExcess() public {
        bytes32 salt = keccak256("salt1");
        uint256 excess = 0.01 ether;
        uint256 balBefore = address(this).balance;
        factory.createAccount{value: CREATION_FEE + excess}(owner, AGENT_ID, salt);
        uint256 balAfter = address(this).balance;
        // Should have paid only CREATION_FEE
        assertEq(balBefore - balAfter, CREATION_FEE);
    }

    function test_FactoryCreateAccount_FeeGoesToCollector() public {
        bytes32 salt = keccak256("salt1");
        uint256 collectorBefore = feeCollector.balance;
        _createAccount(salt);
        uint256 collectorAfter = feeCollector.balance;
        assertEq(collectorAfter - collectorBefore, CREATION_FEE);
    }

    function test_FactoryGetCreationFee() public view {
        assertEq(factory.getCreationFee(), CREATION_FEE);
    }

    // --- Execute tests ---

    function test_ExecuteAsOwner() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address target = address(0xBEEF);
        vm.prank(owner);
        account.execute(target, 0.1 ether, "");

        // Target receives value minus fee: 0.1 ETH - 0.0001 ETH (10bps) = 0.0999 ETH
        uint256 expectedFee = 0.0001 ether; // 0.1 ETH * 10 / 10000
        assertEq(target.balance, 0.1 ether - expectedFee);
        assertEq(feeCollector.balance, CREATION_FEE + expectedFee);
    }

    function test_ExecuteAsEntryPoint() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address target = address(0xBEEF);
        vm.prank(entryPoint);
        account.execute(target, 0.1 ether, "");

        uint256 expectedFee = 0.0001 ether;
        assertEq(target.balance, 0.1 ether - expectedFee);
    }

    function test_ExecuteUnauthorized() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address attacker = address(0xBAD);
        vm.prank(attacker);
        vm.expectRevert(AgentSmartAccount.NotAuthorized.selector);
        account.execute(address(0xBEEF), 0.1 ether, "");
    }

    function test_Execute_NoFeeOnZeroValue() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));

        uint256 collectorBefore = feeCollector.balance;
        vm.prank(owner);
        // Zero-value call (e.g. ERC-20 approve) — no fee
        account.execute(address(0xBEEF), 0, abi.encodeWithSignature("approve(address,uint256)", address(this), 100));
        uint256 collectorAfter = feeCollector.balance;
        // No additional fees collected
        assertEq(collectorAfter, collectorBefore);
    }

    function test_Execute_TransferFee() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 10 ether);

        address target = address(0xBEEF);
        uint256 collectorBefore = feeCollector.balance;

        vm.prank(owner);
        account.execute(target, 1 ether, "");

        // Fee = 1 ETH * 10 / 10000 = 0.001 ETH
        uint256 expectedFee = 0.001 ether;
        assertEq(target.balance, 1 ether - expectedFee);
        assertEq(feeCollector.balance - collectorBefore, expectedFee);
    }

    function test_Execute_FeeCapApplied() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 2000 ether);

        address target = address(0xBEEF);
        uint256 collectorBefore = feeCollector.balance;

        vm.prank(owner);
        account.execute(target, 1000 ether, "");

        // Fee = 1000 ETH * 10 / 10000 = 1 ETH
        // Cap = $100 at $2000 = 0.05 ETH
        // Fee should be capped at 0.05 ETH
        uint256 cappedFee = 0.05 ether;
        assertEq(target.balance, 1000 ether - cappedFee);
        assertEq(feeCollector.balance - collectorBefore, cappedFee);
    }

    // --- Batch execute tests ---

    function test_ExecuteBatch() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address[] memory targets = new address[](2);
        targets[0] = address(0xBEEF);
        targets[1] = address(0xCAFE);

        uint256[] memory values = new uint256[](2);
        values[0] = 0.1 ether;
        values[1] = 0.2 ether;

        bytes[] memory datas = new bytes[](2);
        datas[0] = "";
        datas[1] = "";

        vm.prank(owner);
        account.executeBatch(targets, values, datas);

        // Fee on 0.1 ETH = 0.0001 ETH, on 0.2 ETH = 0.0002 ETH
        assertEq(address(0xBEEF).balance, 0.1 ether - 0.0001 ether);
        assertEq(address(0xCAFE).balance, 0.2 ether - 0.0002 ether);
    }

    function test_ExecuteBatch_FeePerCall() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(account), 10 ether);

        address[] memory targets = new address[](3);
        targets[0] = address(0xBEEF);
        targets[1] = address(0xCAFE);
        targets[2] = address(0xDEAD);

        uint256[] memory values = new uint256[](3);
        values[0] = 1 ether;
        values[1] = 0;         // zero value — no fee
        values[2] = 2 ether;

        bytes[] memory datas = new bytes[](3);
        datas[0] = "";
        datas[1] = "";
        datas[2] = "";

        uint256 collectorBefore = feeCollector.balance;
        vm.prank(owner);
        account.executeBatch(targets, values, datas);

        // Fees: 0.001 ETH + 0 + 0.002 ETH = 0.003 ETH
        uint256 totalFees = 0.001 ether + 0.002 ether;
        assertEq(feeCollector.balance - collectorBefore, totalFees);
        assertEq(address(0xBEEF).balance, 1 ether - 0.001 ether);
        assertEq(address(0xDEAD).balance, 2 ether - 0.002 ether);
    }

    // --- Receive ETH ---

    function test_ReceiveETH_NoFee() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));
        vm.deal(address(this), 1 ether);

        uint256 collectorBefore = feeCollector.balance;
        (bool success, ) = payable(address(account)).call{value: 0.5 ether}("");
        assertTrue(success);
        assertEq(address(account).balance, 0.5 ether);
        // No fee charged on inbound
        assertEq(feeCollector.balance, collectorBefore);
    }

    // --- ValidateUserOp tests ---

    function test_ValidateUserOp_OnlyEntryPoint() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));

        UserOperation memory userOp;
        userOp.sender = address(account);
        userOp.callData = "";
        userOp.signature = "";

        vm.prank(owner);
        vm.expectRevert(AgentSmartAccount.NotAuthorized.selector);
        account.validateUserOp(userOp, bytes32(0), 0);
    }

    function test_ValidateUserOp_InvalidSignature() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));

        UserOperation memory userOp;
        userOp.sender = address(account);
        userOp.callData = "";
        // Invalid signature (wrong length)
        userOp.signature = hex"0000";

        vm.prank(entryPoint);
        uint256 result = account.validateUserOp(userOp, bytes32(uint256(1)), 0);
        assertEq(result, 1); // SIG_VALIDATION_FAILED
    }

    function test_ValidateUserOp_ValidSignature() public {
        AgentSmartAccount account = _createAccount(keccak256("salt"));

        // Setup a permission with no constraints (allow all)
        vm.startPrank(owner);
        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);
        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);
        enforcer.setConstraints(permissionId, 0, 0, 0, allowedActions, allowedTokens);
        vm.stopPrank();

        bytes32 userOpHash = keccak256("test-op");

        // Sign with owner key
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", userOpHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerKey, prefixedHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Build callData for execute(target, value, data)
        bytes memory callData = abi.encodeWithSelector(
            account.execute.selector,
            address(0xBEEF),
            uint256(0),
            ""
        );

        UserOperation memory userOp;
        userOp.sender = address(account);
        userOp.callData = callData;
        userOp.signature = signature;

        vm.prank(entryPoint);
        uint256 result = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(result, 0); // Success
    }

    // --- Constraint tests (unchanged logic, just updated constructors) ---

    function test_ProtocolConstraint() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);
        address[] memory allowedProtocols = new address[](1);
        allowedProtocols[0] = UNISWAP;
        uint256[] memory allowedChains = new uint256[](0);

        enforcer.setConstraints(
            permissionId, 0, 0, 0,
            allowedActions, allowedTokens, allowedProtocols, allowedChains
        );

        vm.stopPrank();

        // Uniswap allowed (extended format)
        IERC8004ValidationRegistry.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC, UNISWAP, uint256(1))
        );
        assertTrue(result1.valid);

        // Unknown protocol not allowed
        IERC8004ValidationRegistry.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC, address(0xDEAD), uint256(1))
        );
        assertFalse(result2.valid);
    }

    function test_ChainConstraint() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](0);
        address[] memory allowedProtocols = new address[](0);
        uint256[] memory allowedChains = new uint256[](2);
        allowedChains[0] = 1;      // Ethereum mainnet
        allowedChains[1] = 11155111; // Sepolia

        enforcer.setConstraints(
            permissionId, 0, 0, 0,
            allowedActions, allowedTokens, allowedProtocols, allowedChains
        );

        vm.stopPrank();

        // Ethereum mainnet allowed
        IERC8004ValidationRegistry.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC, address(0), uint256(1))
        );
        assertTrue(result1.valid);

        // BSC not allowed
        IERC8004ValidationRegistry.ValidationResult memory result2 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC, address(0), uint256(56))
        );
        assertFalse(result2.valid);
    }

    function test_BackwardCompatibleActionData() public {
        vm.startPrank(owner);

        bytes32 policyId = policyRegistry.createPolicy(POLICY_HASH);
        bytes32 permissionId = policyRegistry.grantPermission(policyId, AGENT_ID, 0, 0);

        bytes32[] memory allowedActions = new bytes32[](0);
        address[] memory allowedTokens = new address[](1);
        allowedTokens[0] = USDC;

        // Set constraints with protocols/chains
        address[] memory allowedProtocols = new address[](1);
        allowedProtocols[0] = UNISWAP;
        uint256[] memory allowedChains = new uint256[](1);
        allowedChains[0] = 1;

        enforcer.setConstraints(
            permissionId, 5000e18, 0, 0,
            allowedActions, allowedTokens, allowedProtocols, allowedChains
        );

        vm.stopPrank();

        // Legacy format (64 bytes) - protocol/chain constraints not checked
        IERC8004ValidationRegistry.ValidationResult memory result1 = enforcer.validateAction(
            AGENT_ID,
            SWAP_ACTION,
            abi.encode(1000e18, USDC)
        );
        assertTrue(result1.valid);
    }

    // Needed to receive ETH refunds from factory
    receive() external payable {}
}
