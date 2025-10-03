const hre = require("hardhat");

async function main() {
    const GistBoard = await hre.ethers.getContractFactory("GistBoard");
    const gistBoard = await GistBoard.deploy();

    await gistBoard.deployed();

    console.log("✅ GistBoard contract deployed to:", gistBoard.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});