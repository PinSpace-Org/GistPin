// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title FlareNetworkConfig
 * @dev Configuration contract for Flare/Songbird network specific settings
 * Provides network-specific constants and utilities for Ethers.js integration
 */
contract FlareNetworkConfig {
    // Flare Network Chain IDs
    uint256 public constant FLARE_MAINNET_CHAIN_ID = 14;
    uint256 public constant SONGBIRD_TESTNET_CHAIN_ID = 19;
    uint256 public constant COSTON_TESTNET_CHAIN_ID = 16;
    uint256 public constant COSTON2_TESTNET_CHAIN_ID = 114;
    
    // Network-specific gas optimization settings
    uint256 public constant FLARE_BLOCK_TIME = 1.8 seconds;
    uint256 public constant SONGBIRD_BLOCK_TIME = 1.8 seconds;
    
    // Rate limiting adjustments for different networks
    mapping(uint256 => uint256) public networkCooldownPeriods;
    
    // Events for network configuration
    event NetworkConfigUpdated(uint256 indexed chainId, uint256 cooldownPeriod);
    
    constructor() {
        // Set default cooldown periods for different networks
        networkCooldownPeriods[FLARE_MAINNET_CHAIN_ID] = 5 minutes;
        networkCooldownPeriods[SONGBIRD_TESTNET_CHAIN_ID] = 2 minutes; // Faster for testing
        networkCooldownPeriods[COSTON_TESTNET_CHAIN_ID] = 1 minutes;   // Even faster for development
        networkCooldownPeriods[COSTON2_TESTNET_CHAIN_ID] = 1 minutes;
    }
    
    /**
     * @dev Get the current network's chain ID
     * @return chainId The current chain ID
     */
    function getCurrentChainId() external view returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }
    
    /**
     * @dev Check if current network is a Flare network
     * @return isFlareNetwork True if running on a Flare network
     */
    function isFlareNetwork() external view returns (bool isFlareNetwork) {
        uint256 chainId = this.getCurrentChainId();
        return chainId == FLARE_MAINNET_CHAIN_ID || 
               chainId == SONGBIRD_TESTNET_CHAIN_ID || 
               chainId == COSTON_TESTNET_CHAIN_ID ||
               chainId == COSTON2_TESTNET_CHAIN_ID;
    }
    
    /**
     * @dev Get network-specific cooldown period
     * @return cooldownPeriod The cooldown period for current network
     */
    function getNetworkCooldownPeriod() external view returns (uint256 cooldownPeriod) {
        uint256 chainId = this.getCurrentChainId();
        cooldownPeriod = networkCooldownPeriods[chainId];
        
        // Default to 5 minutes if network not configured
        if (cooldownPeriod == 0) {
            cooldownPeriod = 5 minutes;
        }
    }
    
    /**
     * @dev Get network information for Ethers.js frontend
     * @return info Structured network information
     */
    function getNetworkInfo() external view returns (NetworkInfo memory info) {
        uint256 chainId = this.getCurrentChainId();
        
        info.chainId = chainId;
        info.isFlareNetwork = this.isFlareNetwork();
        info.cooldownPeriod = this.getNetworkCooldownPeriod();
        info.blockTime = _getBlockTime(chainId);
        info.networkName = _getNetworkName(chainId);
    }
    
    /**
     * @dev Get optimal gas settings for current network
     * @return gasSettings Recommended gas settings
     */
    function getOptimalGasSettings() external view returns (GasSettings memory gasSettings) {
        uint256 chainId = this.getCurrentChainId();
        
        if (chainId == FLARE_MAINNET_CHAIN_ID) {
            gasSettings.gasPrice = 25 gwei;
            gasSettings.gasLimit = 300000;
        } else if (chainId == SONGBIRD_TESTNET_CHAIN_ID) {
            gasSettings.gasPrice = 25 gwei;
            gasSettings.gasLimit = 300000;
        } else {
            // Testnet defaults
            gasSettings.gasPrice = 25 gwei;
            gasSettings.gasLimit = 500000; // Higher limit for testing
        }
        
        gasSettings.maxFeePerGas = gasSettings.gasPrice * 2;
        gasSettings.maxPriorityFeePerGas = gasSettings.gasPrice / 10;
    }
    
    // Internal helper functions
    function _getBlockTime(uint256 chainId) internal pure returns (uint256) {
        if (chainId == FLARE_MAINNET_CHAIN_ID || chainId == SONGBIRD_TESTNET_CHAIN_ID) {
            return 1.8 seconds;
        }
        return 2 seconds; // Default for testnets
    }
    
    function _getNetworkName(uint256 chainId) internal pure returns (string memory) {
        if (chainId == FLARE_MAINNET_CHAIN_ID) return "Flare";
        if (chainId == SONGBIRD_TESTNET_CHAIN_ID) return "Songbird";
        if (chainId == COSTON_TESTNET_CHAIN_ID) return "Coston";
        if (chainId == COSTON2_TESTNET_CHAIN_ID) return "Coston2";
        return "Unknown";
    }
    
    // Structs for organized data
    struct NetworkInfo {
        uint256 chainId;
        bool isFlareNetwork;
        uint256 cooldownPeriod;
        uint256 blockTime;
        string networkName;
    }
    
    struct GasSettings {
        uint256 gasPrice;
        uint256 gasLimit;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
    }
}
