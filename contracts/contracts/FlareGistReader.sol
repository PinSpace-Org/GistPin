// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ChecklistStore.sol";

/**
 * @title FlareGistReader
 * @dev Utility contract for efficient gist reading operations on Flare/Songbird networks
 * Optimized for Ethers.js frontend integration
 */
contract FlareGistReader {
    ChecklistStore public immutable checklistStore;
    
    constructor(address _checklistStore) {
        checklistStore = ChecklistStore(_checklistStore);
    }
    
    /**
     * @dev Get comprehensive gist data for frontend dashboard
     * @param offset Starting index for pagination
     * @param limit Maximum number of items to return
     * @return gists Array of gist data
     * @return pagination Pagination information
     * @return stats Basic statistics
     */
    function getGistDashboard(uint256 offset, uint256 limit) 
        external 
        view 
        returns (
            ChecklistStore.ChecklistItem[] memory gists,
            PaginationInfo memory pagination,
            BasicStats memory stats
        ) 
    {
        // Get paginated gists
        bool hasMore;
        (gists, pagination.totalCount, hasMore) = checklistStore.getPaginatedGists(offset, limit);
        
        pagination.offset = offset;
        pagination.limit = limit;
        pagination.hasMore = hasMore;
        pagination.currentPage = offset / limit + 1;
        pagination.totalPages = (pagination.totalCount + limit - 1) / limit;
        
        // Get basic stats
        (stats.totalGists, stats.totalUsers, stats.totalDevices, stats.averageGistsPerUser) = 
            checklistStore.getContractStats();
    }
    
    /**
     * @dev Get user profile with their gists and device info
     * @param user The user address
     * @param gistOffset Starting index for user's gists
     * @param gistLimit Maximum number of gists to return
     * @return profile Complete user profile data
     */
    function getUserProfile(address user, uint256 gistOffset, uint256 gistLimit) 
        external 
        view 
        returns (UserProfile memory profile) 
    {
        profile.userAddress = user;
        profile.totalGists = checklistStore.getUserChecklistCount(user);
        profile.totalDevices = checklistStore.getUserDeviceCount(user);
        
        // Get user's gists
        (profile.gists, ) = checklistStore.getUserGists(user, gistOffset, gistLimit);
    }
    
    /**
     * @dev Search gists by content (basic string matching)
     * @param searchTerm The term to search for
     * @param maxResults Maximum number of results to return
     * @return results Array of matching gists
     */
    function searchGists(string memory searchTerm, uint256 maxResults) 
        external 
        view 
        returns (ChecklistStore.ChecklistItem[] memory results) 
    {
        bytes memory searchBytes = bytes(searchTerm);
        if (searchBytes.length == 0) {
            return new ChecklistStore.ChecklistItem[](0);
        }
        
        uint256 totalGists = checklistStore.getChecklistCount();
        ChecklistStore.ChecklistItem[] memory tempResults = new ChecklistStore.ChecklistItem[](maxResults);
        uint256 found = 0;
        
        for (uint256 i = 0; i < totalGists && found < maxResults; i++) {
            ChecklistStore.ChecklistItem memory gist = checklistStore.getChecklist(i);
            
            // Simple substring search (case-sensitive)
            if (contains(bytes(gist.content), searchBytes)) {
                tempResults[found] = gist;
                found++;
            }
        }
        
        // Resize array to actual results
        results = new ChecklistStore.ChecklistItem[](found);
        for (uint256 i = 0; i < found; i++) {
            results[i] = tempResults[i];
        }
    }
    
    /**
     * @dev Get trending gists (most recent within last 24 hours)
     * @param limit Maximum number of trending gists to return
     * @return trending Array of trending gists
     */
    function getTrendingGists(uint256 limit) 
        external 
        view 
        returns (ChecklistStore.ChecklistItem[] memory trending) 
    {
        uint256 oneDayAgo = block.timestamp - 24 hours;
        return checklistStore.getGistsByTimeRange(oneDayAgo, block.timestamp, limit);
    }
    
    // Structs for organized data return
    struct PaginationInfo {
        uint256 offset;
        uint256 limit;
        uint256 totalCount;
        uint256 currentPage;
        uint256 totalPages;
        bool hasMore;
    }
    
    struct BasicStats {
        uint256 totalGists;
        uint256 totalUsers;
        uint256 totalDevices;
        uint256 averageGistsPerUser;
    }
    
    struct UserProfile {
        address userAddress;
        uint256 totalGists;
        uint256 totalDevices;
        ChecklistStore.ChecklistItem[] gists;
    }
    
    /**
     * @dev Helper function to check if bytes contains substring
     * @param data The data to search in
     * @param search The substring to search for
     * @return found True if substring is found
     */
    function contains(bytes memory data, bytes memory search) 
        internal 
        pure 
        returns (bool found) 
    {
        if (search.length > data.length) {
            return false;
        }
        
        for (uint256 i = 0; i <= data.length - search.length; i++) {
            bool match = true;
            for (uint256 j = 0; j < search.length; j++) {
                if (data[i + j] != search[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        
        return false;
    }
}
