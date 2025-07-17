const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("LockModule", (m) => {
  // Set the unlock time to 60 seconds from now
  const unlockTime = m.getParameter("unlockTime", Math.floor(Date.now() / 1000) + 60);
  
  // Set the amount to lock to 0.001 ETH
  const lockedAmount = m.getParameter("lockedAmount", 1_000_000_000_000_000n); // This is 0.001 Ether in wei

  // Define the contract deployment
  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  // Return the deployed contract instance
  return { lock };
});
