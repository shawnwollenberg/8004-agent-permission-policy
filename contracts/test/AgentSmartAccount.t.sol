// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentSmartAccount.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PermissionEnforcer.sol";
import "../src/PolicyRegistry.sol";
import "../src/IdentityRegistry.sol";

contract AgentSmartAccountTest is Test {
    AgentAccountFactory public factory;
    PermissionEnforcer public enforcer;
    PolicyRegistry public policyRegistry;
    IdentityRegistry public identityRegistry;

    address public owner;
    uint256 public ownerKey;
    address public entryPoint = address(0xEE);

    bytes32 public constant AGENT_ID = keccak256("smart-agent-1");
    bytes32 public constant POLICY_HASH = keccak256("policy-content");
    bytes32 public constant SWAP_ACTION = keccak256("swap");

    address public constant USDC = address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    address public constant UNISWAP = address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    function setUp() public {
        // Generate owner key pair
        ownerKey = 0xABCD;
        owner = vm.addr(ownerKey);

        vm.startPrank(owner);

        identityRegistry = new IdentityRegistry();
        policyRegistry = new PolicyRegistry(address(identityRegistry));
        enforcer = new PermissionEnforcer(address(policyRegistry), address(identityRegistry));
        factory = new AgentAccountFactory(address(enforcer), entryPoint);

        // Register agent
        identityRegistry.registerAgent(AGENT_ID, '{"name":"Smart Agent"}');

        vm.stopPrank();
    }

    function test_FactoryCreateAccount() public {
        bytes32 salt = keccak256("salt1");
        address predicted = factory.getAddress(owner, AGENT_ID, salt);

        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, salt);
        assertEq(address(account), predicted);
        assertEq(account.owner(), owner);
        assertEq(account.agentId(), AGENT_ID);
        assertEq(account.entryPoint(), entryPoint);
    }

    function test_FactoryIdempotent() public {
        bytes32 salt = keccak256("salt1");
        AgentSmartAccount account1 = factory.createAccount(owner, AGENT_ID, salt);
        AgentSmartAccount account2 = factory.createAccount(owner, AGENT_ID, salt);
        assertEq(address(account1), address(account2));
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

    function test_ExecuteAsOwner() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address target = address(0xBEEF);
        vm.prank(owner);
        account.execute(target, 0.1 ether, "");
        assertEq(target.balance, 0.1 ether);
    }

    function test_ExecuteAsEntryPoint() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address target = address(0xBEEF);
        vm.prank(entryPoint);
        account.execute(target, 0.1 ether, "");
        assertEq(target.balance, 0.1 ether);
    }

    function test_ExecuteUnauthorized() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));
        vm.deal(address(account), 1 ether);

        address attacker = address(0xBAD);
        vm.prank(attacker);
        vm.expectRevert(AgentSmartAccount.NotAuthorized.selector);
        account.execute(address(0xBEEF), 0.1 ether, "");
    }

    function test_ExecuteBatch() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));
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

        assertEq(address(0xBEEF).balance, 0.1 ether);
        assertEq(address(0xCAFE).balance, 0.2 ether);
    }

    function test_ValidateUserOp_OnlyEntryPoint() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));

        UserOperation memory userOp;
        userOp.sender = address(account);
        userOp.callData = "";
        userOp.signature = "";

        vm.prank(owner);
        vm.expectRevert(AgentSmartAccount.NotAuthorized.selector);
        account.validateUserOp(userOp, bytes32(0), 0);
    }

    function test_ValidateUserOp_InvalidSignature() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));

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
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));

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

    function test_ReceiveETH() public {
        AgentSmartAccount account = factory.createAccount(owner, AGENT_ID, keccak256("salt"));
        vm.deal(address(this), 1 ether);
        (bool success, ) = payable(address(account)).call{value: 0.5 ether}("");
        assertTrue(success);
        assertEq(address(account).balance, 0.5 ether);
    }
}
