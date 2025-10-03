// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title GistBoard
 * @dev A smart contract for creating and storing hyperlocal, anonymous gists.
 * Each gist is pinned to a geographic location and has a limited lifespan.
 */
contract GistBoard {
    error GistNotFound();
    error GistExpired();
    error GistTextCannotBeEmpty();
    error InvalidDuration();

    mapping(string => Gist[]) public gistsByLocation;

    
    uint256 private _gistIdCounter;

    
    struct Gist {
        uint256 id;
        address creator;
        string text;
        int256 latitude;
        int256 longitude;
        uint256 timestamp;
        uint256 expiresAt; 
        string category;
    }

    
    mapping(uint256 => Gist) public gists;

    
    event GistCreated(
        uint256 indexed gistId,
        address indexed creator,
        int256 latitude,
        int256 longitude,
        string category,
        uint256 expiresAt
    );

    

    /**
     * @dev Modifier to ensure a Gist has not expired.
     * @param _gistId The ID of the Gist to check.
     */
    modifier notExpired(uint256 _gistId) {
        if (_gistId >= _gistIdCounter) revert GistNotFound();
        if (gists[_gistId].expiresAt <= block.timestamp) revert GistExpired();
        _;
    }

    

    /**
     * @dev Creates a new Gist and stores it on the blockchain.
     * @param _text The content of the Gist.
     * @param _latitude The latitude (multiplied by 1e6 for precision).
     * @param _longitude The longitude (multiplied by 1e6 for precision).
     * @param _category The category of the Gist.
     * @param _duration The duration in seconds for which the Gist will be active.
     */
    function createGist(
        string calldata _text,
        int256 _latitude,
        int256 _longitude,
        string calldata _category,
        uint256 _duration // NEW: Duration parameter
    ) external {
        if (bytes(_text).length == 0) revert GistTextCannotBeEmpty();
        // Ensure the duration is reasonable (e.g., at least 1 minute)
        if (_duration < 60) revert InvalidDuration();

        uint256 gistId = _gistIdCounter;
        uint256 expiresAt = block.timestamp + _duration; // NEW: Calculate expiry

        gists[gistId] = Gist({
            id: gistId,
            creator: msg.sender,
            text: _text,
            latitude: _latitude,
            longitude: _longitude,
            timestamp: block.timestamp,
            expiresAt: expiresAt, // NEW: Store expiry
            category: _category
        });

        emit GistCreated(gistId, msg.sender, _latitude, _longitude, _category, expiresAt);

        _gistIdCounter++;
    }

    /**
     * @dev Retrieves a single Gist by its ID, provided it has not expired.
     * @param _gistId The ID of the Gist to retrieve.
     * @return The Gist struct.
     */
    function getGist(uint256 _gistId)
        external
        view
        notExpired(_gistId) // Use the modifier here
        returns (Gist memory)
    {
        return gists[_gistId];
    }

    /**
     * @dev Returns the total number of Gists ever created.
     * The front-end can use this to loop and fetch Gists one by one.
     */
    function getTotalGists() external view returns (uint256) {
        return _gistIdCounter;
    }

    function pinGist(string memory _locationId, string memory _message) public {
        require(bytes(_locationId).length > 0, "Location ID cannot be empty.");
        require(bytes(_message).length > 0, "Message cannot be empty.");

        Gist memory newGist = Gist({
            pinner: msg.sender,
            message: _message,
            timestamp: block.timestamp
        });

        gistsByLocation[_locationId].push(newGist);

        console.log(
            "New Gist pinned by %s to location %s",
            msg.sender,
            _locationId
        );
        emit NewGist(msg.sender, _locationId, block.timestamp, _message);
    }

    function getGistsForLocation(string memory _locationId)
        public
        view
        returns (Gist[] memory)
    {
        return gistsByLocation[_locationId];
    }
}
