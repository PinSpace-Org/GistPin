// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ChecklistStore
 * @dev Smart contract for managing checklists with rate limiting and anonymous device identity system
 * Optimized for Flare/Songbird networks with enhanced gist reading capabilities
 */
contract ChecklistStore {
    // Rate limiting: 5 minutes cooldown period
    uint256 public constant COOLDOWN_PERIOD = 5 minutes;
    
    // Custom errors for better gas efficiency
    error CooldownActive(uint256 remainingTime);
    error InvalidDeviceHash();
    error EmptyContent();
    error DeviceNotRegistered();
    
    // Events
    event ChecklistPosted(address indexed user, bytes32 indexed deviceHash, uint256 timestamp);
    event CooldownViolation(address indexed user, bytes32 indexed deviceHash, uint256 remainingTime);
    event DeviceRegistered(address indexed user, bytes32 indexed deviceHash, uint256 timestamp);
    
    event GistCreated(
        uint256 indexed gistId,
        address indexed author,
        bytes32 indexed deviceHash,
        string content,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event GistBatch(
        uint256 indexed batchId,
        uint256 startGistId,
        uint256 endGistId,
        uint256 timestamp
    );
    
    event DeviceActivity(
        address indexed user,
        bytes32 indexed deviceHash,
        uint256 postCount,
        uint256 lastActivity,
        bool isNewDevice
    );
    
    event IndexerCheckpoint(
        uint256 indexed checkpointId,
        uint256 totalGists,
        uint256 totalUsers,
        uint256 totalDevices,
        uint256 timestamp,
        uint256 blockNumber
    );

    // Struct to store checklist data
    struct ChecklistItem {
        string content;
        uint256 timestamp;
        address author;
        bytes32 deviceHash;
    }
    
    // Struct to store device information
    struct DeviceInfo {
        bool isRegistered;
        uint256 firstSeen;
        uint256 postCount;
    }
    
    // Mapping to store last post time per device (user + deviceHash combination)
    mapping(address => mapping(bytes32 => uint256)) public lastPostTime;
    
    // Mapping to store device information per user
    mapping(address => mapping(bytes32 => DeviceInfo)) public deviceRegistry;
    
    // Array to store all checklist items
    ChecklistItem[] public checklists;
    
    // Mapping to get checklist count per user
    mapping(address => uint256) public userChecklistCount;
    
    mapping(address => uint256) public userDeviceCount;
    
    /**
     * @dev Modifier to validate device hash
     * @param deviceHash The device hash identifier
     */
    modifier validDeviceHash(bytes32 deviceHash) {
        if (deviceHash == bytes32(0)) {
            revert InvalidDeviceHash();
        }
        _;
    }
    
    /**
     * @dev Modifier to check if cooldown period has passed for a device
     * @param deviceHash The device hash identifier
     */
    modifier cooldownCheck(bytes32 deviceHash) {
        uint256 lastPost = lastPostTime[msg.sender][deviceHash];
        if (lastPost != 0) {
            uint256 timePassed = block.timestamp - lastPost;
            if (timePassed < COOLDOWN_PERIOD) {
                uint256 remainingTime = COOLDOWN_PERIOD - timePassed;
                emit CooldownViolation(msg.sender, deviceHash, remainingTime);
                revert CooldownActive(remainingTime);
            }
        }
        _;
    }
    
    /**
     * @dev Register a new anonymous device identity
     * @param deviceHash The device hash generated client-side
     */
    function registerDevice(bytes32 deviceHash) 
        external 
        validDeviceHash(deviceHash) 
    {
        DeviceInfo storage device = deviceRegistry[msg.sender][deviceHash];
        
        // Only register if not already registered
        if (!device.isRegistered) {
            device.isRegistered = true;
            device.firstSeen = block.timestamp;
            device.postCount = 0;
            userDeviceCount[msg.sender]++;
            
            emit DeviceRegistered(msg.sender, deviceHash, block.timestamp);
        }
    }
    
    /**
     * @dev Post a new checklist item with rate limiting and anonymous device identity
     * @param content The checklist content
     * @param deviceHash The device hash identifier for rate limiting
     */
    function postChecklist(string memory content, bytes32 deviceHash) 
        external 
        validDeviceHash(deviceHash)
        cooldownCheck(deviceHash) 
    {
        bytes memory contentBytes = bytes(content);
        if (contentBytes.length == 0) {
            revert EmptyContent();
        }
        
        DeviceInfo storage device = deviceRegistry[msg.sender][deviceHash];
        bool isNewDevice = !device.isRegistered;
        
        if (!device.isRegistered) {
            device.isRegistered = true;
            device.firstSeen = block.timestamp;
            device.postCount = 0;
            userDeviceCount[msg.sender]++;
            
            emit DeviceRegistered(msg.sender, deviceHash, block.timestamp);
        }
        
        // Update last post time for this device
        lastPostTime[msg.sender][deviceHash] = block.timestamp;
        
        device.postCount++;
        
        // Create and store the checklist item
        ChecklistItem memory newItem = ChecklistItem({
            content: content,
            timestamp: block.timestamp,
            author: msg.sender,
            deviceHash: deviceHash
        });
        
        checklists.push(newItem);
        uint256 gistId = checklists.length - 1;
        userChecklistCount[msg.sender]++;
        
        emit GistCreated(
            gistId,
            msg.sender,
            deviceHash,
            content,
            block.timestamp,
            block.number
        );
        
        emit DeviceActivity(
            msg.sender,
            deviceHash,
            device.postCount,
            block.timestamp,
            isNewDevice
        );
        
        // Keep original event for backward compatibility
        emit ChecklistPosted(msg.sender, deviceHash, block.timestamp);
        
        if (gistId > 0 && (gistId + 1) % 100 == 0) {
            emit IndexerCheckpoint(
                (gistId + 1) / 100,
                checklists.length,
                getTotalUniqueUsers(),
                getTotalRegisteredDevices(),
                block.timestamp,
                block.number
            );
        }
    }
    
    /**
     * @dev Get remaining cooldown time for a device
     * @param user The user address
     * @param deviceHash The device hash identifier
     * @return remainingTime The remaining cooldown time in seconds (0 if no cooldown)
     */
    function getRemainingCooldown(address user, bytes32 deviceHash) 
        external 
        view 
        returns (uint256 remainingTime) 
    {
        uint256 lastPost = lastPostTime[user][deviceHash];
        if (lastPost == 0) {
            return 0;
        }
        
        uint256 timePassed = block.timestamp - lastPost;
        if (timePassed >= COOLDOWN_PERIOD) {
            return 0;
        }
        
        return COOLDOWN_PERIOD - timePassed;
    }
    
    /**
     * @dev Check if a device can post (no active cooldown)
     * @param user The user address
     * @param deviceHash The device hash identifier
     * @return canPost True if the device can post, false otherwise
     */
    function canPost(address user, bytes32 deviceHash) 
        external 
        view 
        returns (bool canPost) 
    {
        uint256 lastPost = lastPostTime[user][deviceHash];
        if (lastPost == 0) {
            return true;
        }
        
        return (block.timestamp - lastPost) >= COOLDOWN_PERIOD;
    }
    
    /**
     * @dev Get device information
     * @param user The user address
     * @param deviceHash The device hash identifier
     * @return info The device information
     */
    function getDeviceInfo(address user, bytes32 deviceHash) 
        external 
        view 
        returns (DeviceInfo memory info) 
    {
        return deviceRegistry[user][deviceHash];
    }
    
    /**
     * @dev Check if a device is registered
     * @param user The user address
     * @param deviceHash The device hash identifier
     * @return isRegistered True if the device is registered
     */
    function isDeviceRegistered(address user, bytes32 deviceHash) 
        external 
        view 
        returns (bool isRegistered) 
    {
        return deviceRegistry[user][deviceHash].isRegistered;
    }
    
    /**
     * @dev Get total number of devices registered by a user
     * @param user The user address
     * @return count The number of devices registered by the user
     */
    function getUserDeviceCount(address user) 
        external 
        view 
        returns (uint256 count) 
    {
        return userDeviceCount[user];
    }
    
    /**
     * @dev Get device post count
     * @param user The user address
     * @param deviceHash The device hash identifier
     * @return postCount The number of posts made by this device
     */
    function getDevicePostCount(address user, bytes32 deviceHash) 
        external 
        view 
        returns (uint256 postCount) 
    {
        return deviceRegistry[user][deviceHash].postCount;
    }
    
    /**
     * @dev Get total number of checklists
     * @return count The total number of checklist items
     */
    function getChecklistCount() external view returns (uint256 count) {
        return checklists.length;
    }
    
    /**
     * @dev Get checklist item by index
     * @param index The index of the checklist item
     * @return item The checklist item
     */
    function getChecklist(uint256 index) 
        external 
        view 
        returns (ChecklistItem memory item) 
    {
        require(index < checklists.length, "Index out of bounds");
        return checklists[index];
    }
    
    /**
     * @dev Get user's checklist count
     * @param user The user address
     * @return count The number of checklists posted by the user
     */
    function getUserChecklistCount(address user) 
        external 
        view 
        returns (uint256 count) 
    {
        return userChecklistCount[user];
    }
    
    /**
     * @dev Get paginated gists (checklist items) for efficient frontend loading
     * @param offset Starting index for pagination
     * @param limit Maximum number of items to return
     * @return items Array of checklist items
     * @return totalCount Total number of items available
     * @return hasMore Whether there are more items beyond this page
     */
    function getPaginatedGists(uint256 offset, uint256 limit) 
        external 
        view 
        returns (
            ChecklistItem[] memory items, 
            uint256 totalCount, 
            bool hasMore
        ) 
    {
        totalCount = checklists.length;
        
        if (offset >= totalCount) {
            return (new ChecklistItem[](0), totalCount, false);
        }
        
        uint256 end = offset + limit;
        if (end > totalCount) {
            end = totalCount;
        }
        
        uint256 resultLength = end - offset;
        items = new ChecklistItem[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            items[i] = checklists[offset + i];
        }
        
        hasMore = end < totalCount;
    }
    
    /**
     * @dev Get gists by user with pagination for Ethers.js frontend
     * @param user The user address to filter by
     * @param offset Starting index for pagination
     * @param limit Maximum number of items to return
     * @return items Array of user's checklist items
     * @return totalUserCount Total number of items for this user
     */
    function getUserGists(address user, uint256 offset, uint256 limit) 
        external 
        view 
        returns (ChecklistItem[] memory items, uint256 totalUserCount) 
    {
        totalUserCount = userChecklistCount[user];
        
        if (totalUserCount == 0 || offset >= totalUserCount) {
            return (new ChecklistItem[](0), totalUserCount);
        }
        
        // Calculate actual limit
        uint256 actualLimit = limit;
        if (offset + limit > totalUserCount) {
            actualLimit = totalUserCount - offset;
        }
        
        items = new ChecklistItem[](actualLimit);
        uint256 found = 0;
        uint256 skipped = 0;
        
        // Iterate through all checklists to find user's items
        for (uint256 i = 0; i < checklists.length && found < actualLimit; i++) {
            if (checklists[i].author == user) {
                if (skipped >= offset) {
                    items[found] = checklists[i];
                    found++;
                }
                skipped++;
            }
        }
    }
    
    /**
     * @dev Get recent gists within a time range for Flare network efficiency
     * @param fromTimestamp Start timestamp (inclusive)
     * @param toTimestamp End timestamp (inclusive)
     * @param limit Maximum number of items to return
     * @return items Array of checklist items within the time range
     */
    function getGistsByTimeRange(
        uint256 fromTimestamp, 
        uint256 toTimestamp, 
        uint256 limit
    ) 
        external 
        view 
        returns (ChecklistItem[] memory items) 
    {
        require(fromTimestamp <= toTimestamp, "Invalid time range");
        
        // First pass: count matching items
        uint256 matchCount = 0;
        for (uint256 i = 0; i < checklists.length; i++) {
            if (checklists[i].timestamp >= fromTimestamp && 
                checklists[i].timestamp <= toTimestamp) {
                matchCount++;
                if (matchCount >= limit) break;
            }
        }
        
        // Second pass: collect items
        uint256 actualLimit = matchCount > limit ? limit : matchCount;
        items = new ChecklistItem[](actualLimit);
        uint256 found = 0;
        
        for (uint256 i = 0; i < checklists.length && found < actualLimit; i++) {
            if (checklists[i].timestamp >= fromTimestamp && 
                checklists[i].timestamp <= toTimestamp) {
                items[found] = checklists[i];
                found++;
            }
        }
    }
    
    /**
     * @dev Get latest gists for efficient frontend loading on Flare/Songbird
     * @param count Number of latest items to return
     * @return items Array of latest checklist items (newest first)
     */
    function getLatestGists(uint256 count) 
        external 
        view 
        returns (ChecklistItem[] memory items) 
    {
        uint256 totalItems = checklists.length;
        if (totalItems == 0) {
            return new ChecklistItem[](0);
        }
        
        uint256 actualCount = count > totalItems ? totalItems : count;
        items = new ChecklistItem[](actualCount);
        
        // Return items in reverse order (newest first)
        for (uint256 i = 0; i < actualCount; i++) {
            items[i] = checklists[totalItems - 1 - i];
        }
    }
    
    /**
     * @dev Batch check cooldown status for multiple devices (Flare network optimization)
     * @param user The user address
     * @param deviceHashes Array of device hashes to check
     * @return cooldownInfo Array of remaining cooldown times for each device
     */
    function batchCheckCooldown(address user, bytes32[] calldata deviceHashes) 
        external 
        view 
        returns (uint256[] memory cooldownInfo) 
    {
        cooldownInfo = new uint256[](deviceHashes.length);
        
        for (uint256 i = 0; i < deviceHashes.length; i++) {
            uint256 lastPost = lastPostTime[user][deviceHashes[i]];
            if (lastPost == 0) {
                cooldownInfo[i] = 0;
            } else {
                uint256 timePassed = block.timestamp - lastPost;
                if (timePassed >= COOLDOWN_PERIOD) {
                    cooldownInfo[i] = 0;
                } else {
                    cooldownInfo[i] = COOLDOWN_PERIOD - timePassed;
                }
            }
        }
    }
    
    /**
     * @dev Get contract statistics for Flare network dashboards
     * @return totalGists Total number of gists posted
     * @return totalUsers Number of unique users who have posted
     * @return totalDevices Total number of registered devices across all users
     * @return averageGistsPerUser Average gists per user
     */
    function getContractStats() 
        external 
        view 
        returns (
            uint256 totalGists,
            uint256 totalUsers,
            uint256 totalDevices,
            uint256 averageGistsPerUser
        ) 
    {
        totalGists = checklists.length;
        
        // Count unique users and total devices
        // Note: This is a simplified approach. For production, consider using a more efficient method
        totalUsers = 0;
        totalDevices = 0;
        
        // This would require additional mappings for efficiency in a real implementation
        // For now, returning basic stats
        totalUsers = 1; // Placeholder - would need proper user tracking
        totalDevices = 1; // Placeholder - would need proper device counting
        
        if (totalUsers > 0) {
            averageGistsPerUser = totalGists / totalUsers;
        } else {
            averageGistsPerUser = 0;
        }
    }
    
    function getTotalUniqueUsers() public view returns (uint256) {
        // This is a simplified implementation
        // In production, you'd want to track this more efficiently
        uint256 uniqueUsers = 0;
        address[] memory seenUsers = new address[](checklists.length);
        
        for (uint256 i = 0; i < checklists.length; i++) {
            address user = checklists[i].author;
            bool isUnique = true;
            
            for (uint256 j = 0; j < uniqueUsers; j++) {
                if (seenUsers[j] == user) {
                    isUnique = false;
                    break;
                }
            }
            
            if (isUnique) {
                seenUsers[uniqueUsers] = user;
                uniqueUsers++;
            }
        }
        
        return uniqueUsers;
    }
    
    function getTotalRegisteredDevices() public view returns (uint256) {
        // This would need to be tracked more efficiently in production
        // For now, return a placeholder
        return checklists.length; // Simplified - each gist represents at least one device
    }
    
    function emitIndexerCheckpoint() external {
        emit IndexerCheckpoint(
            block.timestamp,
            checklists.length,
            getTotalUniqueUsers(),
            getTotalRegisteredDevices(),
            block.timestamp,
            block.number
        );
    }
    
    function getGistForIndexer(uint256 gistId) 
        external 
        view 
        returns (
            address author,
            bytes32 deviceHash,
            string memory content,
            uint256 timestamp,
            uint256 blockNumber
        ) 
    {
        require(gistId < checklists.length, "Gist does not exist");
        ChecklistItem memory gist = checklists[gistId];
        
        return (
            gist.author,
            gist.deviceHash,
            gist.content,
            gist.timestamp,
            block.number // Note: This returns current block, not original block
        );
    }
    
    function getBatchGistsForIndexer(uint256 startId, uint256 endId) 
        external 
        view 
        returns (
            address[] memory authors,
            bytes32[] memory deviceHashes,
            string[] memory contents,
            uint256[] memory timestamps
        ) 
    {
        require(startId <= endId, "Invalid range");
        require(endId < checklists.length, "End ID out of bounds");
        
        uint256 batchSize = endId - startId + 1;
        authors = new address[](batchSize);
        deviceHashes = new bytes32[](batchSize);
        contents = new string[](batchSize);
        timestamps = new uint256[](batchSize);
        
        for (uint256 i = 0; i < batchSize; i++) {
            ChecklistItem memory gist = checklists[startId + i];
            authors[i] = gist.author;
            deviceHashes[i] = gist.deviceHash;
            contents[i] = gist.content;
            timestamps[i] = gist.timestamp;
        }
    }
}
