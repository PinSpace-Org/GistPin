require('dotenv').config();
const { ethers } = require('ethers');
const haversine = require('haversine-distance');

// --- Contract Setup ---
const GIST_CONTRACT_ABI = [
    "function getGists() view returns (tuple(uint256 id, string message, int256 lat, int256 lon, uint256 expiration)[] memory)"
];

// Load from environment variables
const GIST_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;

if (!GIST_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("Error: Please set CONTRACT_ADDRESS and RPC_URL in your .env file.");
    process.exit(1);
}

// --- Mock Data for Testing ---
const USE_MOCK_DATA = false;
const MOCK_GISTS = [
    { id: 1, message: "Gist near Abuja (active)", lat: 90678, lon: 73996, expiration: Math.floor(Date.now() / 1000) + 3600 },
    { id: 2, message: "Gist far from Abuja", lat: 65344, lon: 33779, expiration: Math.floor(Date.now() / 1000) + 3600 },
    { id: 3, message: "Gist near Abuja (expired)", lat: 90670, lon: 74000, expiration: Math.floor(Date.now() / 1000) - 3600 },
    { id: 4, message: "Another Gist near Abuja", lat: 90800, lon: 74100, expiration: Math.floor(Date.now() / 1000) + 7200 },
];

async function main() {
    console.log("🔍 Starting gist filtering script...");

    // Mock user location (e.g., Abuja) and search radius
    const userLocation = { lat: 9.0765, lng: 7.3986 };
    const searchRadiusKm = 10;
    console.log(`Searching within ${searchRadiusKm}km of Lat: ${userLocation.lat}, Lon: ${userLocation.lng}`);

    let allGistsRaw;

    if (USE_MOCK_DATA) {
        console.log("Using mock data for demonstration.");
        allGistsRaw = MOCK_GISTS;
    } else {
        try {
            console.log("Connecting to blockchain provider...");
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const contract = new ethers.Contract(GIST_CONTRACT_ADDRESS, GIST_CONTRACT_ABI, provider);

            console.log("Fetching all gists from the contract...");
            allGistsRaw = await contract.getGists();
            console.log(`Found ${allGistsRaw.length} total gists on-chain.`);
        } catch (error) {
            console.error("❌ Error fetching data from the contract:", error.message);
            return;
        }
    }

    // Convert contract data to a more usable format
    const allGists = allGistsRaw.map(gist => ({
        id: Number(gist.id),
        message: gist.message,
        lat: Number(gist.lat) / 10000, // Assuming lat/lon are stored as integers
        lon: Number(gist.lon) / 10000,
        expiration: Number(gist.expiration),
    }));

    // --- Filtering Logic ---
    const nowInSeconds = Math.floor(Date.now() / 1000);

    const filteredGists = allGists.filter(gist => {
        // 1. Filter by expiration
        if (gist.expiration < nowInSeconds) {
            return false; // Gist is expired
        }

        // 2. Filter by location
        const gistLocation = { lat: gist.lat, lon: gist.lon };
        const distanceMeters = haversine(userLocation, gistLocation);
        const distanceKm = distanceMeters / 1000;

        return distanceKm <= searchRadiusKm;
    });

    console.log("\n✅ Filtering complete. Results:");
    console.log("---------------------------------");

    if (filteredGists.length > 0) {
        filteredGists.forEach(gist => {
            console.log(`
  ID:      ${gist.id}
  Message: "${gist.message}"
  Coords:  Lat ${gist.lat.toFixed(4)}, Lon ${gist.lon.toFixed(4)}
            `);
        });
    } else {
        console.log("No active gists found within the specified radius.");
    }
    console.log("---------------------------------");
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
