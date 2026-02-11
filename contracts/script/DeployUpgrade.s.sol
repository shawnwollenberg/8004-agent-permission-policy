// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PermissionEnforcer.sol";
import "../src/AgentAccountFactory.sol";

/// @notice Deploys only the updated PermissionEnforcer and new AgentAccountFactory.
///         Reuses existing IdentityRegistry and PolicyRegistry addresses.
contract DeployUpgradeScript is Script {
    // ERC-4337 EntryPoint v0.6 canonical address
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;

    // Existing deployed contracts on Sepolia (unchanged)
    address constant IDENTITY_REGISTRY = 0xc1fa477f991C74Cc665E605fC74f0e2B795b5104;
    address constant POLICY_REGISTRY = 0x92cd41e6a4aA13072CeBCda8830d48f269F058c4;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy updated PermissionEnforcer (with protocol/chain constraint support)
        PermissionEnforcer enforcer = new PermissionEnforcer(
            POLICY_REGISTRY,
            IDENTITY_REGISTRY
        );
        console.log("PermissionEnforcer deployed at:", address(enforcer));

        // Deploy new AgentAccountFactory
        AgentAccountFactory factory = new AgentAccountFactory(
            address(enforcer),
            ENTRY_POINT
        );
        console.log("AgentAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        console.log("\n--- Upgrade Deployment Summary ---");
        console.log("IdentityRegistry (existing):", IDENTITY_REGISTRY);
        console.log("PolicyRegistry (existing):", POLICY_REGISTRY);
        console.log("PermissionEnforcer (NEW):", address(enforcer));
        console.log("AgentAccountFactory (NEW):", address(factory));
        console.log("EntryPoint:", ENTRY_POINT);
    }
}
