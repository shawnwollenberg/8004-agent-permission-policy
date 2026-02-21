// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PermissionEnforcer.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PriceOracle.sol";
import "../src/GuardrailFeeManager.sol";

/// @notice Deploys GuardrailFeeManager, new PermissionEnforcer, and new AgentAccountFactory.
///         Reuses existing IdentityRegistry, PolicyRegistry, and PriceOracle.
contract DeployFeeUpgradeScript is Script {
    // ERC-4337 EntryPoint v0.6 canonical address
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    // Existing deployed contracts on Sepolia (unchanged)
    address constant IDENTITY_REGISTRY = 0xc1fa477f991C74Cc665E605fC74f0e2B795b5104;
    address constant POLICY_REGISTRY = 0x92cd41e6a4aA13072CeBCda8830d48f269F058c4;
    address constant PRICE_ORACLE = 0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy new PermissionEnforcer (reuse existing registries)
        PermissionEnforcer enforcer = new PermissionEnforcer(
            POLICY_REGISTRY,
            IDENTITY_REGISTRY
        );
        console.log("PermissionEnforcer deployed at:", address(enforcer));

        // 2. Wire existing PriceOracle into the new enforcer
        enforcer.setPriceOracle(PRICE_ORACLE);
        console.log("PriceOracle wired into PermissionEnforcer");

        // 3. Deploy GuardrailFeeManager
        //    $10 creation fee, 10 bps (0.10%) transfer fee, $100 cap
        GuardrailFeeManager feeManager = new GuardrailFeeManager(
            PRICE_ORACLE,
            feeCollector,
            10_000000,   // $10 (6 decimals)
            10,          // 10 bps = 0.10%
            100_000000   // $100 cap (6 decimals)
        );
        console.log("GuardrailFeeManager deployed at:", address(feeManager));

        // 4. Deploy new AgentAccountFactory (with enforcer + entryPoint + feeManager)
        AgentAccountFactory factory = new AgentAccountFactory(
            address(enforcer),
            ENTRY_POINT,
            address(feeManager)
        );
        console.log("AgentAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("\n--- Fee Upgrade Deployment Summary ---");
        console.log("IdentityRegistry (existing):", IDENTITY_REGISTRY);
        console.log("PolicyRegistry (existing):", POLICY_REGISTRY);
        console.log("PriceOracle (existing):", PRICE_ORACLE);
        console.log("PermissionEnforcer (NEW):", address(enforcer));
        console.log("GuardrailFeeManager (NEW):", address(feeManager));
        console.log("AgentAccountFactory (NEW):", address(factory));
        console.log("EntryPoint:", ENTRY_POINT);
        console.log("Fee Collector:", feeCollector);
    }
}
