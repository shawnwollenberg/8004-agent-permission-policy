// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/IdentityRegistry.sol";
import "../src/PolicyRegistry.sol";
import "../src/PermissionEnforcer.sol";
import "../src/AgentAccountFactory.sol";
import "../src/PriceOracle.sol";
import "../src/GuardrailFeeManager.sol";

/// @notice Full deployment script (superseded by DeployFeeUpgrade.s.sol for new deployments)
contract DeployScript is Script {
    // ERC-4337 EntryPoint v0.6 canonical address
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    // Sepolia Chainlink ETH/USD feed
    address constant ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeCollector = vm.envAddress("FEE_COLLECTOR");

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

        // Deploy PriceOracle
        PriceOracle oracle = new PriceOracle(ETH_USD_FEED);
        console.log("PriceOracle deployed at:", address(oracle));

        enforcer.setPriceOracle(address(oracle));

        // Deploy GuardrailFeeManager ($10 creation, 10bps transfer, $100 cap)
        GuardrailFeeManager feeManager = new GuardrailFeeManager(
            address(oracle),
            feeCollector,
            10_000000,  // $10 (6 decimals)
            10,         // 10 bps = 0.10%
            100_000000  // $100 cap (6 decimals)
        );
        console.log("GuardrailFeeManager deployed at:", address(feeManager));

        // Deploy Agent Account Factory
        AgentAccountFactory factory = new AgentAccountFactory(
            address(enforcer),
            ENTRY_POINT,
            address(feeManager)
        );
        console.log("AgentAccountFactory deployed at:", address(factory));

        vm.stopBroadcast();

        // Output deployment addresses for verification
        console.log("\n--- Deployment Summary ---");
        console.log("IdentityRegistry:", address(identityRegistry));
        console.log("PolicyRegistry:", address(policyRegistry));
        console.log("PermissionEnforcer:", address(enforcer));
        console.log("PriceOracle:", address(oracle));
        console.log("GuardrailFeeManager:", address(feeManager));
        console.log("AgentAccountFactory:", address(factory));
        console.log("EntryPoint:", ENTRY_POINT);
    }
}
