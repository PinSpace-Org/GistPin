require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Retrieve environment variables
const { SONGBIRD_RPC_URL, FLARE_RPC_URL, PRIVATE_KEY } = process.env;

// Define a custom task to check the balance of the deployer account
// Usage: npx hardhat check-balance --network songbird
task(
  "check-balance",
  "Prints the account balance of the configured private key",
  async (taskArgs, hre) => {
    const [account] = await hre.ethers.getSigners();
    const balance = await hre.ethers.provider.getBalance(account.address);
    const network = hre.network.name;

    // Get the correct currency symbol
    let symbol = "ETH";
    if (network === "songbird") symbol = "SGB";
    if (network === "flare") symbol = "FLR";

    console.log(`\nNetwork: ${network}`);
    console.log(`Account: ${account.address}`);
    console.log(`Balance: ${hre.ethers.formatEther(balance)} ${symbol}\n`);
  }
);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    },
    // Songbird Canary Network (for testing)
    songbird: {
      url: SONGBIRD_RPC_URL || "",
      chainId: 19,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    // Flare Mainnet (for production)
    flare: {
      url: FLARE_RPC_URL || "",
      chainId: 14,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
