// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";
import "../src/PermissionEnforcer.sol";

contract DeployPriceOracleScript is Script {
    // Sepolia Chainlink price feed addresses
    address constant ETH_USD_FEED = 0x694AA1769357215DE4FAC081bf1f309aDC325306;
    address constant USDC_USD_FEED = 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E;
    address constant LINK_USD_FEED = 0xc59E3633BAAC79493d908e63626716e204A45EdF;

    // Sepolia token addresses
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant LINK = 0x779877A7B0D9E8603169DdbD7836e478b4624789;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address enforcerAddress = vm.envAddress("PERMISSION_ENFORCER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PriceOracle with ETH/USD feed
        PriceOracle oracle = new PriceOracle(ETH_USD_FEED);
        console.log("PriceOracle deployed at:", address(oracle));

        // Configure token feeds
        oracle.setTokenFeed(USDC, USDC_USD_FEED);
        console.log("USDC feed configured");

        oracle.setTokenFeed(LINK, LINK_USD_FEED);
        console.log("LINK feed configured");

        // Wire oracle into PermissionEnforcer
        PermissionEnforcer enforcer = PermissionEnforcer(enforcerAddress);
        enforcer.setPriceOracle(address(oracle));
        console.log("PriceOracle set on PermissionEnforcer");

        vm.stopBroadcast();

        console.log("\n--- Deployment Summary ---");
        console.log("PriceOracle:", address(oracle));
        console.log("PermissionEnforcer:", enforcerAddress);
    }
}
