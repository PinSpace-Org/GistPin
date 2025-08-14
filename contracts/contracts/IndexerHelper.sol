// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ChecklistStore.sol";

/**
 * @title IndexerHelper
 * @dev Utility contract to help off-chain indexers efficiently query and process gist data
 * Optimized for Flare/Songbird networks with WebSocket event listening support
 */
contract IndexerHelper {
    ChecklistStore public immutable checklistStore;
    
    // Events specifically for indexer synchronization
    event IndexerSync(
        uint256 indexed syncId,
        uint256 fromGistId,
        uint256 toGistId,
        uint256 timestamp
    );
    
    event IndexerBatchProcessed(
        uint256 indexed batchId,
        uint256 gistCount,
        uint256 processingTime
    );
    
    constructor(address _checklistStore) {
        checklistStore = ChecklistStore(_checklistStore);
    }
    
    /**
     * @dev Get comprehensive gist data for indexer with metadata
     * @param gistId The gist ID to retrieve
     * @return gistData Complete gist information for indexing
     */
    function getGistWithMetadata(uint256 gistId) 
        external 
        view 
        returns (
            ChecklistStore.ChecklistItem memory gistData,
            uint256 authorTotalGists,
            uint256 deviceTotalPosts,
            bool isDeviceFirstPost
        ) 
    {
        gistData = checklistStore.getChecklist(gistId);
        authorTotalGists = checklistStore.getUserChecklistCount(gistData.author);
        
        ChecklistStore.DeviceInfo memory deviceInfo = checklistStore.getDeviceInfo(
            gistData.author, 
            gistData.deviceHash
        );
        
        deviceTotalPosts = deviceInfo.postCount;
        isDeviceFirstPost = (deviceInfo.postCount == 1);
    }
    
    /**
     * @dev Get gist range with comprehensive metadata for batch indexing
     * @param startId Starting gist ID
     * @param endId Ending gist ID (inclusive)
     * @return gists Array of gist data
     * @return metadata Array of metadata for each gist
     */
    function getGistRangeWithMetadata(uint256 startId, uint256 endId) 
        external 
        view 
        returns (
            ChecklistStore.ChecklistItem[] memory gists,
            GistMetadata[] memory metadata
        ) 
    {
        require(startId <= endId, "Invalid range");
        uint256 totalGists = checklistStore.getChecklistCount();
        require(endId < totalGists, "End ID out of bounds");
        
        uint256 rangeSize = endId - startId + 1;
        gists = new ChecklistStore.ChecklistItem[](rangeSize);
        metadata = new GistMetadata[](rangeSize);
        
        for (uint256 i = 0; i < rangeSize; i++) {
            uint256 gistId = startId + i;
            gists[i] = checklistStore.getChecklist(gistId);
            
            ChecklistStore.DeviceInfo memory deviceInfo = checklistStore.getDeviceInfo(
                gists[i].author, 
                gists[i].deviceHash
            );
            
            metadata[i] = GistMetadata({
                gistId: gistId,
                authorTotalGists: checklistStore.getUserChecklistCount(gists[i].author),
                deviceTotalPosts: deviceInfo.postCount,
                deviceFirstSeen: deviceInfo.firstSeen,
                isDeviceFirstPost: (deviceInfo.postCount == 1)
            });
        }
    }
    
    /**
     * @dev Struct for gist metadata used by indexers
     */
    struct GistMetadata {
        uint256 gistId;
        uint256 authorTotalGists;
        uint256 deviceTotalPosts;
        uint256 deviceFirstSeen;
        bool isDeviceFirstPost;
    }
    
    /**
     * @dev Get indexer synchronization data
     * @return totalGists Current total number of gists
     * @return lastGistTimestamp Timestamp of the most recent gist
     * @return contractStats Basic contract statistics
     */
    function getIndexerSyncData() 
        external 
        view 
        returns (
            uint256 totalGists,
            uint256 lastGistTimestamp,
            ContractStats memory contractStats
        ) 
    {
        totalGists = checklistStore.getChecklistCount();
        
        if (totalGists > 0) {
            ChecklistStore.ChecklistItem memory lastGist = checklistStore.getChecklist(totalGists - 1);
            lastGistTimestamp = lastGist.timestamp;
        } else {
            lastGistTimestamp = 0;
        }
        
        (uint256 totalGistsStats, uint256 totalUsers, uint256 totalDevices, uint256 avgGists) = 
            checklistStore.getContractStats();
            
        contractStats = ContractStats({
            totalGists: totalGistsStats,
            totalUsers: totalUsers,
            totalDevices: totalDevices,
            averageGistsPerUser: avgGists
        });
    }
    
    struct ContractStats {
        uint256 totalGists;
        uint256 totalUsers;
        uint256 totalDevices;
        uint256 averageGistsPerUser;
    }
    
    /**
     * @dev Emit sync event for indexer coordination
     * @param fromGistId Starting gist ID for sync
     * @param toGistId Ending gist ID for sync
     */
    function emitSyncEvent(uint256 fromGistId, uint256 toGistId) external {
        emit IndexerSync(
            block.timestamp,
            fromGistId,
            toGistId,
            block.timestamp
        );
    }
    
    /**
     * @dev Get gists by time range for efficient indexer queries
     * @param fromTimestamp Start time
     * @param toTimestamp End time
     * @param maxResults Maximum results to return
     * @return gistIds Array of gist IDs in the time range
     * @return hasMore Whether there are more results
     */
    function getGistIdsByTimeRange(
        uint256 fromTimestamp,
        uint256 toTimestamp,
        uint256 maxResults
    ) 
        external 
        view 
        returns (uint256[] memory gistIds, bool hasMore) 
    {
        uint256 totalGists = checklistStore.getChecklistCount();
        uint256[] memory tempIds = new uint256[](maxResults);
        uint256 found = 0;
        
        for (uint256 i = 0; i < totalGists && found < maxResults; i++) {
            ChecklistStore.ChecklistItem memory gist = checklistStore.getChecklist(i);
            if (gist.timestamp >= fromTimestamp && gist.timestamp <= toTimestamp) {
                tempIds[found] = i;
                found++;
            }
        }
        
        // Create properly sized array
        gistIds = new uint256[](found);
        for (uint256 i = 0; i < found; i++) {
            gistIds[i] = tempIds[i];
        }
        
        // Check if there are more results
        hasMore = false;
        if (found == maxResults) {
            for (uint256 i = found; i < totalGists; i++) {
                ChecklistStore.ChecklistItem memory gist = checklistStore.getChecklist(i);
                if (gist.timestamp >= fromTimestamp && gist.timestamp <= toTimestamp) {
                    hasMore = true;
                    break;
                }
            }
        }
    }
}
