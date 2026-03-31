// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PriceOracle.sol";

/// @notice Registers token/USD Chainlink price feeds on a deployed PriceOracle.
///         Run against Base mainnet to add WETH, USDT, DAI, USDbC, cbETH, cbBTC.
///
/// Usage:
///   source .env && forge script script/SetTokenFeeds.s.sol \
///     --rpc-url $BASE_RPC_URL --broadcast
contract SetTokenFeedsScript is Script {

    // ── Deployed PriceOracle (Base mainnet) ───────────────────────────────────
    address constant PRICE_ORACLE = 0x32b2088F68427526bE8931C2Dc61eC2520d10F00;

    // ── Token addresses on Base mainnet ──────────────────────────────────────
    address constant WETH  = 0x4200000000000000000000000000000000000006;
    address constant USDT  = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
    address constant DAI   = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
    address constant USDbC = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
    address constant cbETH = 0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22;
    address constant cbBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;

    // ── Chainlink feed addresses on Base mainnet ──────────────────────────────
    // WETH uses the ETH/USD feed — WETH is always 1:1 with ETH
    address constant FEED_ETH_USD   = 0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70;
    address constant FEED_USDT_USD  = 0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9;
    address constant FEED_DAI_USD   = 0x591e79239a7d679378eC8c847e5038150364C78F;
    // USDbC is bridged USDC — no dedicated feed; USDC/USD is correct
    address constant FEED_USDC_USD  = 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B;
    address constant FEED_cbETH_USD = 0xd7818272B9e248357d13057AAb0B417aF31E817d;
    address constant FEED_cbBTC_USD = 0x07DA0E54543a844a80ABE69c8A12F22B3aA59f9D;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        PriceOracle oracle = PriceOracle(PRICE_ORACLE);

        oracle.setTokenFeed(WETH,  FEED_ETH_USD);
        console.log("WETH  feed set:", FEED_ETH_USD);

        oracle.setTokenFeed(USDT,  FEED_USDT_USD);
        console.log("USDT  feed set:", FEED_USDT_USD);

        oracle.setTokenFeed(DAI,   FEED_DAI_USD);
        console.log("DAI   feed set:", FEED_DAI_USD);

        oracle.setTokenFeed(USDbC, FEED_USDC_USD);
        console.log("USDbC feed set:", FEED_USDC_USD);

        oracle.setTokenFeed(cbETH, FEED_cbETH_USD);
        console.log("cbETH feed set:", FEED_cbETH_USD);

        oracle.setTokenFeed(cbBTC, FEED_cbBTC_USD);
        console.log("cbBTC feed set:", FEED_cbBTC_USD);

        vm.stopBroadcast();

        console.log("\n--- Token feeds registered on PriceOracle:", PRICE_ORACLE, "---");
        console.log("WETH  (0x4200...0006) -> ETH/USD");
        console.log("USDT  (0xfde4...9bb2) -> USDT/USD");
        console.log("DAI   (0x50c5...0Cb)  -> DAI/USD");
        console.log("USDbC (0xd9aA...CA)   -> USDC/USD");
        console.log("cbETH (0x2Ae3...c22)  -> cbETH/USD");
        console.log("cbBTC (0xcbB7...3Bf)  -> cbBTC/USD");
    }
}
