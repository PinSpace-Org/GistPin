// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IChecklistStore
 * @dev Interface for the ChecklistStore contract with anonymous device identity system
 */
interface IChecklistStore {
    // Custom errors
    error CooldownActive(uint256 remainingTime);
    error InvalidDeviceHash();
    error EmptyContent();
    error DeviceNotRegistered();
    
    // Events
    event ChecklistPosted(address indexed user, bytes32 indexed deviceHash, uint256 timestamp);
    event CooldownViolation(address indexed user, bytes32 indexed deviceHash, uint256 remainingTime);
    event DeviceRegistered(address indexed user, bytes32 indexed deviceHash, uint256 timestamp);
    
    // Struct definitions
    struct ChecklistItem {
        string content;
        uint256 timestamp;
        address author;
        bytes32 deviceHash;
    }
    
    struct DeviceInfo {
        bool isRegistered;
        uint256 firstSeen;
        uint256 postCount;
    }
    
    // Core functions
    function registerDevice(bytes32 deviceHash) external;
    function postChecklist(string memory content, bytes32 deviceHash) external;
    function getRemainingCooldown(address user, bytes32 deviceHash) external view returns (uint256);
    function canPost(address user, bytes32 deviceHash) external view returns (bool);
    
    // Device management functions
    function getDeviceInfo(address user, bytes32 deviceHash) external view returns (DeviceInfo memory);
    function isDeviceRegistered(address user, bytes32 deviceHash) external view returns (bool);
    function getUserDeviceCount(address user) external view returns (uint256);
    function getDevicePostCount(address user, bytes32 deviceHash) external view returns (uint256);
    
    // Checklist query functions
    function getChecklistCount() external view returns (uint256);
    function getChecklist(uint256 index) external view returns (ChecklistItem memory);
    function getUserChecklistCount(address user) external view returns (uint256);
    
    // Constants
    function COOLDOWN_PERIOD() external view returns (uint256);
}
