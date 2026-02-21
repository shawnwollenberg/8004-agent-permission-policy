// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PriceOracle.sol";

/**
 * @title GuardrailFeeManager
 * @notice Centralized fee configuration for Guardrail smart accounts and factory
 * @dev All accounts and the factory read fee config from this single updatable source
 */
contract GuardrailFeeManager {
    address public owner;
    address public pendingOwner;
    address public feeCollector;
    PriceOracle public priceOracle;

    // Maximum transfer fee: 10% (1000 bps) — immutable safety cap
    uint256 public constant MAX_TRANSFER_FEE_BPS = 1000;

    // Stored as 6-decimal USD (e.g. 10_000000 = $10)
    uint256 public creationFeeUsd;
    // Basis points (e.g. 10 = 0.10%)
    uint256 public transferFeeBps;
    // Stored as 6-decimal USD (e.g. 100_000000 = $100)
    uint256 public transferFeeCapUsd;

    error NotOwner();
    error NotPendingOwner();
    error ZeroAddress();
    error FeeTooHigh();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeeCollectorUpdated(address indexed newCollector);
    event CreationFeeUpdated(uint256 newFeeUsd);
    event TransferFeeUpdated(uint256 newBps, uint256 newCapUsd);
    event PriceOracleUpdated(address indexed newOracle);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address _priceOracle,
        address _feeCollector,
        uint256 _creationFeeUsd,
        uint256 _transferFeeBps,
        uint256 _transferFeeCapUsd
    ) {
        if (_priceOracle == address(0)) revert ZeroAddress();
        if (_feeCollector == address(0)) revert ZeroAddress();
        if (_transferFeeBps > MAX_TRANSFER_FEE_BPS) revert FeeTooHigh();

        owner = msg.sender;
        priceOracle = PriceOracle(_priceOracle);
        feeCollector = _feeCollector;
        creationFeeUsd = _creationFeeUsd;
        transferFeeBps = _transferFeeBps;
        transferFeeCapUsd = _transferFeeCapUsd;
    }

    /**
     * @notice Convert creationFeeUsd to wei using the price oracle
     * @dev Formula: usdAmount * 1e18 * 1e8 / (ethUsdPrice * 1e6)
     *      where ethUsdPrice has 8 decimals and usdAmount has 6 decimals
     */
    function getCreationFeeWei() external view returns (uint256) {
        return _usdToWei(creationFeeUsd);
    }

    /**
     * @notice Calculate the transfer fee in wei for a given ETH value
     * @param value The ETH value being transferred (in wei)
     * @return fee The fee amount in wei
     */
    function calculateTransferFee(uint256 value) external view returns (uint256) {
        if (value == 0) return 0;

        uint256 fee = (value * transferFeeBps) / 10000;
        uint256 capWei = _usdToWei(transferFeeCapUsd);

        if (fee > capWei) {
            return capWei;
        }
        return fee;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    function setCreationFee(uint256 _creationFeeUsd) external onlyOwner {
        creationFeeUsd = _creationFeeUsd;
        emit CreationFeeUpdated(_creationFeeUsd);
    }

    function setTransferFee(uint256 _transferFeeBps, uint256 _transferFeeCapUsd) external onlyOwner {
        if (_transferFeeBps > MAX_TRANSFER_FEE_BPS) revert FeeTooHigh();
        transferFeeBps = _transferFeeBps;
        transferFeeCapUsd = _transferFeeCapUsd;
        emit TransferFeeUpdated(_transferFeeBps, _transferFeeCapUsd);
    }

    function setPriceOracle(address _priceOracle) external onlyOwner {
        if (_priceOracle == address(0)) revert ZeroAddress();
        priceOracle = PriceOracle(_priceOracle);
        emit PriceOracleUpdated(_priceOracle);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert ZeroAddress();
        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    /**
     * @notice Convert a USD amount (6 decimals) to wei using the ETH/USD price oracle
     * @dev ethUsdPrice is 8 decimals from Chainlink. We compute:
     *      weiAmount = usdAmount * 1e18 * 1e8 / (ethUsdPrice * 1e6)
     *      Simplified: weiAmount = usdAmount * 1e20 / ethUsdPrice
     */
    function _usdToWei(uint256 usdAmount) internal view returns (uint256) {
        if (usdAmount == 0) return 0;
        uint256 ethUsdPrice = priceOracle.getEthUsdPrice(); // 8 decimals
        return (usdAmount * 1e20) / ethUsdPrice;
    }
}
