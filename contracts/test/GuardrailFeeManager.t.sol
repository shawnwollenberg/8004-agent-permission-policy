// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/GuardrailFeeManager.sol";
import "../src/PriceOracle.sol";
import "../src/interfaces/IAggregatorV3.sol";

contract MockChainlinkFeed is IAggregatorV3 {
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

contract GuardrailFeeManagerTest is Test {
    GuardrailFeeManager public feeManager;
    PriceOracle public oracle;
    MockChainlinkFeed public ethUsdFeed;

    address public feeCollector = address(0xFEE);
    address public admin;

    function setUp() public {
        admin = address(this);

        // ETH/USD = $2000, 8 decimals (Chainlink standard)
        ethUsdFeed = new MockChainlinkFeed(2000e8, 8);
        oracle = new PriceOracle(address(ethUsdFeed));

        // $10 creation fee, 10 bps transfer fee, $100 cap
        feeManager = new GuardrailFeeManager(
            address(oracle),
            feeCollector,
            10_000000,   // $10 (6 decimals)
            10,          // 10 bps = 0.10%
            100_000000   // $100 cap (6 decimals)
        );
    }

    function test_CreationFeeCalculation() public view {
        // $10 at ETH=$2000 = 0.005 ETH = 5e15 wei
        // Formula: 10_000000 * 1e20 / 2000e8 = 10_000000 * 1e20 / 200000000000
        // = 1e26 / 2e11 = 5e14... let me compute:
        // 10_000000 = 10000000
        // 10000000 * 1e20 = 1e27
        // 2000e8 = 200000000000 = 2e11
        // 1e27 / 2e11 = 5e15 = 0.005 ether
        uint256 feeWei = feeManager.getCreationFeeWei();
        assertEq(feeWei, 0.005 ether);
    }

    function test_TransferFee_Basic() public view {
        // 1 ETH × 10bps = 0.001 ETH
        uint256 fee = feeManager.calculateTransferFee(1 ether);
        assertEq(fee, 0.001 ether);
    }

    function test_TransferFee_Cap() public view {
        // 1000 ETH × 10bps = 1 ETH
        // Cap = $100 at ETH=$2000 = 0.05 ETH
        // 1 ETH > 0.05 ETH → capped at 0.05 ETH
        uint256 fee = feeManager.calculateTransferFee(1000 ether);
        assertEq(fee, 0.05 ether);
    }

    function test_TransferFee_ZeroValue() public view {
        uint256 fee = feeManager.calculateTransferFee(0);
        assertEq(fee, 0);
    }

    function test_TransferFee_SmallAmount() public view {
        // 0.1 ETH × 10bps = 0.0001 ETH
        uint256 fee = feeManager.calculateTransferFee(0.1 ether);
        assertEq(fee, 0.0001 ether);
    }

    function test_TransferFee_JustBelowCap() public view {
        // Cap = $100 = 0.05 ETH at $2000
        // Fee at 10bps reaching 0.05 ETH means value = 0.05 * 10000 / 10 = 50 ETH
        // 50 ETH × 10bps = 0.05 ETH = exactly at cap
        uint256 fee = feeManager.calculateTransferFee(50 ether);
        assertEq(fee, 0.05 ether);
    }

    function test_AdminFunctions_SetFeeCollector() public {
        address newCollector = address(0xBEEF);
        feeManager.setFeeCollector(newCollector);
        assertEq(feeManager.feeCollector(), newCollector);
    }

    function test_AdminFunctions_SetCreationFee() public {
        // Set to $20
        feeManager.setCreationFee(20_000000);
        assertEq(feeManager.creationFeeUsd(), 20_000000);
        // $20 at $2000 = 0.01 ETH
        assertEq(feeManager.getCreationFeeWei(), 0.01 ether);
    }

    function test_AdminFunctions_SetTransferFee() public {
        // Set to 20 bps, $200 cap
        feeManager.setTransferFee(20, 200_000000);
        assertEq(feeManager.transferFeeBps(), 20);
        assertEq(feeManager.transferFeeCapUsd(), 200_000000);

        // 1 ETH × 20bps = 0.002 ETH
        uint256 fee = feeManager.calculateTransferFee(1 ether);
        assertEq(fee, 0.002 ether);
    }

    function test_AdminFunctions_SetPriceOracle() public {
        MockChainlinkFeed newFeed = new MockChainlinkFeed(4000e8, 8);
        PriceOracle newOracle = new PriceOracle(address(newFeed));
        feeManager.setPriceOracle(address(newOracle));

        // $10 at $4000 = 0.0025 ETH
        assertEq(feeManager.getCreationFeeWei(), 0.0025 ether);
    }

    function test_OnlyOwner_SetFeeCollector() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(GuardrailFeeManager.NotOwner.selector);
        feeManager.setFeeCollector(address(0xBEEF));
    }

    function test_OnlyOwner_SetCreationFee() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(GuardrailFeeManager.NotOwner.selector);
        feeManager.setCreationFee(20_000000);
    }

    function test_OnlyOwner_SetTransferFee() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(GuardrailFeeManager.NotOwner.selector);
        feeManager.setTransferFee(20, 200_000000);
    }

    function test_OnlyOwner_SetPriceOracle() public {
        vm.prank(address(0xBAD));
        vm.expectRevert(GuardrailFeeManager.NotOwner.selector);
        feeManager.setPriceOracle(address(0xBEEF));
    }

    function test_ZeroAddress_Constructor_Oracle() public {
        vm.expectRevert(GuardrailFeeManager.ZeroAddress.selector);
        new GuardrailFeeManager(address(0), feeCollector, 10_000000, 10, 100_000000);
    }

    function test_ZeroAddress_Constructor_Collector() public {
        vm.expectRevert(GuardrailFeeManager.ZeroAddress.selector);
        new GuardrailFeeManager(address(oracle), address(0), 10_000000, 10, 100_000000);
    }

    function test_ZeroAddress_SetFeeCollector() public {
        vm.expectRevert(GuardrailFeeManager.ZeroAddress.selector);
        feeManager.setFeeCollector(address(0));
    }

    function test_ZeroAddress_SetPriceOracle() public {
        vm.expectRevert(GuardrailFeeManager.ZeroAddress.selector);
        feeManager.setPriceOracle(address(0));
    }

    function test_CreationFee_PriceChange() public {
        // ETH price drops to $1000
        ethUsdFeed.setPrice(1000e8);
        // $10 at $1000 = 0.01 ETH
        assertEq(feeManager.getCreationFeeWei(), 0.01 ether);
    }

    function test_TransferFeeCap_PriceChange() public {
        // ETH price drops to $1000
        ethUsdFeed.setPrice(1000e8);
        // Cap = $100 at $1000 = 0.1 ETH
        // 1000 ETH × 10bps = 1 ETH > 0.1 ETH → capped
        uint256 fee = feeManager.calculateTransferFee(1000 ether);
        assertEq(fee, 0.1 ether);
    }
}
