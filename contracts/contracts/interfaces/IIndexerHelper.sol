// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IChecklistStore.sol";

/**
 * @title IIndexerHelper
 * @dev Interface for IndexerHelper contract to support off-chain indexing
 */
interface IIndexerHelper {
    struct GistMetadata {
        uint256 gistId;
        uint256 authorTotalGists;
        uint256 deviceTotalPosts;
        uint256 deviceFirstSeen;
        bool isDeviceFirstPost;
    }
    
    struct ContractStats {
        uint256 totalGists;
        uint256 totalUsers;
        uint256 totalDevices;
        uint256 averageGistsPerUser;
    }
    
    // Events for indexer synchronization
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
    
    // Core indexer functions
    function getGistWithMetadata(uint256 gistId) 
        external 
        view 
        returns (
            IChecklistStore.ChecklistItem memory gistData,
            uint256 authorTotalGists,
            uint256 deviceTotalPosts,
            bool isDeviceFirstPost
        );
    
    function getGistRangeWithMetadata(uint256 startId, uint256 endId) 
        external 
        view 
        returns (
            IChecklistStore.ChecklistItem[] memory gists,
            GistMetadata[] memory metadata
        );
    
    function getIndexerSyncData() 
        external 
        view 
        returns (
            uint256 totalGists,
            uint256 lastGistTimestamp,
            ContractStats memory contractStats
        );
    
    function emitSyncEvent(uint256 fromGistId, uint256 toGistId) external;
    
    function getGistIdsByTimeRange(
        uint256 fromTimestamp,
        uint256 toTimestamp,
        uint256 maxResults
    ) 
        external 
        view 
        returns (uint256[] memory gistIds, bool hasMore);
}
