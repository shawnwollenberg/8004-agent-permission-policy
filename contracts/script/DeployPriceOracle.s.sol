// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PermissionEnforcer.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PriceOracle.sol";
import "../src/GuardrailFeeManager.sol";

/// @notice Deploys PriceOracle, new PermissionEnforcer (with oracle support),
///         GuardrailFeeManager, and new AgentAccountFactory.
///         Reuses existing IdentityRegistry and PolicyRegistry.
///         Superseded by DeployFeeUpgrade.s.sol for new deployments.
contract DeployPriceOracleScript is Script {
    // ERC-4337 EntryPoint v0.6 canonical address
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    // Existing deployed contracts on Sepolia (unchanged)
    address constant IDENTITY_REGISTRY = 0xc1fa477f991C74Cc665E605fC74f0e2B795b5104;
    address constant POLICY_REGISTRY = 0x92cd41e6a4aA13072CeBCda8830d48f269F058c4;

    // Sepolia Chainlink price feed addresses
    address constant ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant USDC_USD_FEED = 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E;
    address constant LINK_USD_FEED = 0xc59E3633BAAC79493d908e63626716e204A45EdF;

    // Sepolia token addresses
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant LINK = 0x779877A7B0D9E8603169DdbD7836e478b4624789;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new PermissionEnforcer (with oracle + owner support)
        PermissionEnforcer enforcer = new PermissionEnforcer(
            POLICY_REGISTRY,
            IDENTITY_REGISTRY
        );
        console.log("PermissionEnforcer deployed at:", address(enforcer));

        // 2. Deploy PriceOracle with ETH/USD feed
        PriceOracle oracle = new PriceOracle(ETH_USD_FEED);
        console.log("PriceOracle deployed at:", address(oracle));

        // 3. Configure token feeds
        oracle.setTokenFeed(USDC, USDC_USD_FEED);
        console.log("USDC feed configured");

        oracle.setTokenFeed(LINK, LINK_USD_FEED);
        console.log("LINK feed configured");

        // 4. Wire oracle into PermissionEnforcer
        enforcer.setPriceOracle(address(oracle));
        console.log("PriceOracle set on PermissionEnforcer");

        // 5. Deploy GuardrailFeeManager ($10 creation, 10bps transfer, $100 cap)
        GuardrailFeeManager feeManager = new GuardrailFeeManager(
            address(oracle),
            feeCollector,
            10_000000,
            10,
            100_000000
        );
        console.log("GuardrailFeeManager deployed at:", address(feeManager));

        // 6. Deploy new AgentAccountFactory with new enforcer + feeManager
        AgentAccountFactory factory = new AgentAccountFactory(
            address(enforcer),
            ENTRY_POINT,
            address(feeManager)
        );
        console.log("AgentAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("\n--- Deployment Summary ---");
        console.log("IdentityRegistry (existing):", IDENTITY_REGISTRY);
        console.log("PolicyRegistry (existing):", POLICY_REGISTRY);
        console.log("PermissionEnforcer (NEW):", address(enforcer));
        console.log("PriceOracle (NEW):", address(oracle));
        console.log("GuardrailFeeManager (NEW):", address(feeManager));
        console.log("AgentAccountFactory (NEW):", address(factory));
        console.log("EntryPoint:", ENTRY_POINT);
    }
}
