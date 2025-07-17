const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("GistBoardModule", (m) => {
  // Define the deployment of the GistBoard contract
  const gistBoard = m.contract("GistBoard");

  // Return the deployed contract instance so it can be accessed later
  return { gistBoard };
});
