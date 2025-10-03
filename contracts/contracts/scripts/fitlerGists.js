const { ethers } = require('hardhat');
require('dotenv').config();
const gistAbi = require('../abi.json');

// --- Configuration ---
const { RPC_PROVIDER_URL, GIST_CONTRACT_ADDRESS } = process.env;


const MOCK_USER_LOCATION = {
    lat: 6.5244,
    lng: 3.3792,
};

const SEARCH_RADIUS_KM = 5.0;

/**
 * Calculates the distance between two lat/lng points in kilometers using the Haversine formula.
 */
function getDistanceInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function main() {
    if (!RPC_PROVIDER_URL || !GIST_CONTRACT_ADDRESS) {
        throw new Error('Missing RPC_PROVIDER_URL or GIST_CONTRACT_ADDRESS in .env file');
    }

    console.log('Connecting to the blockchain...');
    // Note: Hardhat's ethers provider is used here, but a direct provider works too
    const provider = new ethers.JsonRpcProvider(RPC_PROVIDER_URL);
    const contract = new ethers.Contract(GIST_CONTRACT_ADDRESS, gistAbi, provider);

    console.log(`Fetching all gists from contract: ${GIST_CONTRACT_ADDRESS}... 📜`);
    const allGists = await contract.getGists();
    console.log(`Found ${allGists.length} total gists on-chain.`);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const scalingFactor = 1e6; // Assume lat/lng are scaled by 1,000,000 in the contract

    const filteredGists = allGists
        .filter((gist) => Number(gist.expiresAt) > nowInSeconds)
        .filter((gist) => {
            const gistLat = Number(gist.lat) / scalingFactor;
            const gistLng = Number(gist.lng) / scalingFactor;
            const distance = getDistanceInKm(
                MOCK_USER_LOCATION.lat,
                MOCK_USER_LOCATION.lng,
                gistLat,
                gistLng,
            );
            return distance <= SEARCH_RADIUS_KM;
        });

    console.log('\n--- Filtered Gists ---');
    if (filteredGists.length === 0) {
        console.log('No active gists found within the specified radius.');
    } else {
        console.log(`Found ${filteredGists.length} gists within ${SEARCH_RADIUS_KM}km of your location.`);
        const displayGists = filteredGists.map(gist => ({
            id: Number(gist.id),
            message: gist.message,
            location: {
                lat: Number(gist.lat) / scalingFactor,
                lng: Number(gist.lng) / scalingFactor,
            },
            expiresAt: new Date(Number(gist.expiresAt) * 1000).toLocaleString(),
        }));
        console.log(displayGists);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});