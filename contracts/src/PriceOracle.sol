// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAggregatorV3.sol";

contract PriceOracle {
    address public owner;
    IAggregatorV3 public ethUsdFeed;
    mapping(address => IAggregatorV3) public tokenFeeds;

    uint256 public constant STALENESS_THRESHOLD = 1 hours;

    error StalePrice();
    error InvalidPrice();
    error NoFeedConfigured(address token);
    error NotOwner();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _ethUsdFeed) {
        owner = msg.sender;
        ethUsdFeed = IAggregatorV3(_ethUsdFeed);
    }

    function setTokenFeed(address token, address feed) external onlyOwner {
        tokenFeeds[token] = IAggregatorV3(feed);
    }

    function removeTokenFeed(address token) external onlyOwner {
        delete tokenFeeds[token];
    }

    function getEthValue(address token, uint256 amount) external view returns (uint256) {
        // Native ETH — already denominated in wei
        if (token == address(0)) {
            return amount;
        }

        IAggregatorV3 tokenFeed = tokenFeeds[token];
        if (address(tokenFeed) == address(0)) {
            revert NoFeedConfigured(token);
        }

        // Get token/USD price
        (, int256 tokenPrice,, uint256 tokenUpdatedAt,) = tokenFeed.latestRoundData();
        if (tokenPrice <= 0) revert InvalidPrice();
        if (block.timestamp - tokenUpdatedAt > STALENESS_THRESHOLD) revert StalePrice();
        uint8 tokenDecimals = tokenFeed.decimals();

        // Get ETH/USD price
        (, int256 ethPrice,, uint256 ethUpdatedAt,) = ethUsdFeed.latestRoundData();
        if (ethPrice <= 0) revert InvalidPrice();
        if (block.timestamp - ethUpdatedAt > STALENESS_THRESHOLD) revert StalePrice();
        uint8 ethDecimals = ethUsdFeed.decimals();

        // Normalize: ethValue = amount * (tokenPrice / 10^tokenDecimals) / (ethPrice / 10^ethDecimals)
        // Rearranged to avoid precision loss:
        // ethValue = amount * tokenPrice * 10^ethDecimals / (ethPrice * 10^tokenDecimals)
        return (amount * uint256(tokenPrice) * (10 ** ethDecimals)) /
               (uint256(ethPrice) * (10 ** tokenDecimals));
    }

    function getEthUsdPrice() external view returns (uint256) {
        (, int256 price,, uint256 updatedAt,) = ethUsdFeed.latestRoundData();
        if (price <= 0) revert InvalidPrice();
        if (block.timestamp - updatedAt > STALENESS_THRESHOLD) revert StalePrice();
        return uint256(price);
    }
}
