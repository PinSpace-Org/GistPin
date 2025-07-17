// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GistBoard
 * @dev A smart contract for creating and storing hyperlocal, anonymous gists.
 * Each gist is pinned to a geographic location.
 */
contract GistBoard {
    // --- State Variables ---

    // A counter to assign a unique ID to each new Gist.
    uint256 private _gistIdCounter;

    // --- Structs ---

    /**
     * @dev Represents a single Gist post.
     * @param id The unique identifier for the Gist.
     * @param creator The address of the user who created the Gist.
     * @param text The main content or message of the Gist.
     * @param latitude The latitude of the Gist's location (multiplied by 1e6 for precision).
     * @param longitude The longitude of the Gist's location (multiplied by 1e6 for precision).
     * @param timestamp The Unix timestamp when the Gist was created.
     * @param category A category tag for the Gist (e.g., "alert", "tip", "story").
     */
    struct Gist {
        uint256 id;
        address creator;
        string text;
        int256 latitude; // Stored as integer, e.g., 34.052235 becomes 34052235
        int256 longitude; // Stored as integer, e.g., -118.243683 becomes -118243683
        uint256 timestamp;
        string category;
    }

    // --- Mappings ---

    // A mapping from Gist ID to the Gist struct.
    mapping(uint256 => Gist) public gists;

    // --- Events ---

    /**
     * @dev Emitted when a new Gist is successfully created.
     * @param gistId The ID of the newly created Gist.
     * @param creator The address of the Gist's creator.
     * @param latitude The latitude of the Gist's location.
     * @param longitude The longitude of the Gist's location.
     * @param category The category of the Gist.
     */
    event GistCreated(
        uint256 indexed gistId,
        address indexed creator,
        int256 latitude,
        int256 longitude,
        string category
    );

    // --- Functions ---

    /**
     * @dev Creates a new Gist and stores it on the blockchain.
     * @param _text The content of the Gist.
     * @param _latitude The latitude, which should be provided multiplied by 1e6 for precision.
     * @param _longitude The longitude, which should be provided multiplied by 1e6 for precision.
     * @param _category The category of the Gist.
     */
    function createGist(
        string calldata _text,
        int256 _latitude,
        int256 _longitude,
        string calldata _category
    ) external {
        // Ensure input text is not empty
        require(bytes(_text).length > 0, "Gist text cannot be empty.");

        // Assign a new unique ID
        uint256 gistId = _gistIdCounter;

        // Create and store the new Gist struct
        gists[gistId] = Gist({
            id: gistId,
            creator: msg.sender,
            text: _text,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: block.timestamp,
            category: _category
        });

        // Emit the event to notify listeners (like the front-end)
        emit GistCreated(gistId, msg.sender, _latitude, _longitude, _category);

        // Increment the counter for the next Gist
        _gistIdCounter++;
    }

    /**
     * @dev Returns the total number of Gists created.
     * This is useful for front-ends to know how many Gists to fetch.
     */
    function getTotalGists() external view returns (uint256) {
        return _gistIdCounter;
    }
}
