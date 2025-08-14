// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DeviceHashGenerator
 * @dev Utility library for generating and validating device hashes
 * @notice This provides reference implementation for client-side device hash generation
 */
library DeviceHashGenerator {
    /**
     * @dev Generate a device hash from multiple device identifiers
     * @param userAgent Browser user agent string
     * @param screenResolution Screen resolution string (e.g., "1920x1080")
     * @param timezone Timezone offset
     * @param language Browser language
     * @param salt Random salt for additional entropy
     * @return deviceHash The generated device hash
     * @notice This is a reference implementation. Client-side should use similar logic
     */
    function generateDeviceHash(
        string memory userAgent,
        string memory screenResolution,
        int256 timezone,
        string memory language,
        bytes32 salt
    ) internal pure returns (bytes32 deviceHash) {
        return keccak256(
            abi.encodePacked(
                userAgent,
                screenResolution,
                timezone,
                language,
                salt
            )
        );
    }
    
    /**
     * @dev Generate a simplified device hash from basic parameters
     * @param deviceFingerprint A unique device fingerprint string
     * @param timestamp Current timestamp for entropy
     * @return deviceHash The generated device hash
     */
    function generateSimpleDeviceHash(
        string memory deviceFingerprint,
        uint256 timestamp
    ) internal pure returns (bytes32 deviceHash) {
        return keccak256(
            abi.encodePacked(
                deviceFingerprint,
                timestamp
            )
        );
    }
    
    /**
     * @dev Validate that a device hash is not zero
     * @param deviceHash The device hash to validate
     * @return isValid True if the device hash is valid
     */
    function isValidDeviceHash(bytes32 deviceHash) internal pure returns (bool isValid) {
        return deviceHash != bytes32(0);
    }
}
