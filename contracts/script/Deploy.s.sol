// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/PolicyRegistry.sol";
import "../src/PermissionEnforcer.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Identity Registry
        IdentityRegistry identityRegistry = new IdentityRegistry();
        console.log("IdentityRegistry deployed at:", address(identityRegistry));

        // Deploy Policy Registry
        PolicyRegistry policyRegistry = new PolicyRegistry(address(identityRegistry));
        console.log("PolicyRegistry deployed at:", address(policyRegistry));

        // Deploy Permission Enforcer
        PermissionEnforcer enforcer = new PermissionEnforcer(
            address(policyRegistry),
            address(identityRegistry)
        );
        console.log("PermissionEnforcer deployed at:", address(enforcer));

        vm.stopBroadcast();

        // Output deployment addresses for verification
        console.log("\n--- Deployment Summary ---");
        console.log("IdentityRegistry:", address(identityRegistry));
        console.log("PolicyRegistry:", address(policyRegistry));
        console.log("PermissionEnforcer:", address(enforcer));
    }
}
