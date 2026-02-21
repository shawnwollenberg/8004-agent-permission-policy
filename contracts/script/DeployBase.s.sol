// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/PolicyRegistry.sol";
import "../src/PermissionEnforcer.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PriceOracle.sol";
import "../src/GuardrailFeeManager.sol";

/// @notice Full deployment script for Base mainnet (chain ID 8453)
contract DeployBaseScript is Script {
    // ERC-4337 EntryPoint v0.6 canonical address (same on all chains)
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    // Base mainnet Chainlink ETH/USD feed
    address constant ETH_USD_FEED = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    // Base mainnet Chainlink USDC/USD feed
    address constant USDC_USD_FEED = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B;
    // Base native USDC
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Identity Registry
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));

        // 2. Deploy Policy Registry
        PolicyRegistry policyRegistry = new PolicyRegistry(address(identityRegistry));
        console.log("PolicyRegistry deployed at:", address(policyRegistry));

        // 3. Deploy Permission Enforcer
        PermissionEnforcer enforcer = new PermissionEnforcer(
            address(policyRegistry),
            address(identityRegistry)
        );
        console.log("PermissionEnforcer deployed at:", address(enforcer));

        // 4. Deploy PriceOracle with Base mainnet ETH/USD feed
        PriceOracle oracle = new PriceOracle(ETH_USD_FEED);
        console.log("PriceOracle deployed at:", address(oracle));

        // Configure USDC price feed
        oracle.setTokenFeed(USDC, USDC_USD_FEED);
        console.log("USDC price feed configured");

        // Wire oracle into enforcer
        enforcer.setPriceOracle(address(oracle));

        // 5. Deploy GuardrailFeeManager ($10 creation, 10bps transfer, $100 cap)
        GuardrailFeeManager feeManager = new GuardrailFeeManager(
            address(oracle),
            feeCollector,
            10_000000,  // $10 (6 decimals)
            10,         // 10 bps = 0.10%
            100_000000  // $100 cap (6 decimals)
        );
        console.log("GuardrailFeeManager deployed at:", address(feeManager));

        // 6. Deploy Agent Account Factory
        AgentAccountFactory factory = new AgentAccountFactory(
            address(enforcer),
            ENTRY_POINT,
            address(feeManager)
        );
        console.log("AgentAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Output deployment summary
        console.log("\n--- Base Mainnet Deployment Summary ---");
        console.log("IdentityRegistry:", address(identityRegistry));
        console.log("PolicyRegistry:", address(policyRegistry));
        console.log("PermissionEnforcer:", address(enforcer));
        console.log("PriceOracle:", address(oracle));
        console.log("GuardrailFeeManager:", address(feeManager));
        console.log("AgentAccountFactory:", address(factory));
        console.log("EntryPoint:", ENTRY_POINT);
        console.log("USDC:", USDC);
        console.log("Fee Collector:", feeCollector);
    }
}
