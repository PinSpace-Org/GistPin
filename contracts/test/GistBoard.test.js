const {
  loadFixture,
  time, // Import the time helper
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GistBoard", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployGistBoardFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const GistBoard = await ethers.getContractFactory("GistBoard");
    const gistBoard = await GistBoard.deploy();
    return { gistBoard, owner, otherAccount };
  }

  // Default values for creating a gist
  const defaultLat = 34052235;
  const defaultLng = -118243683;
  const defaultText = "Hello, world!";
  const defaultCategory = "story";
  const oneHour = 3600; // 1 hour in seconds

  describe("Gist Creation", function () {
    it("Should allow a user to create a Gist with a duration", async function () {
      const { gistBoard, owner } = await loadFixture(deployGistBoardFixture);

      await gistBoard.createGist(defaultText, defaultLat, defaultLng, defaultCategory, oneHour);

      const newGist = await gistBoard.gists(0);
      const block = await ethers.provider.getBlock("latest");

      expect(newGist.text).to.equal(defaultText);
      expect(newGist.expiresAt).to.equal(block.timestamp + oneHour);
    });

    it("Should emit a GistCreated event with the correct expiresAt", async function () {
      const { gistBoard, owner } = await loadFixture(deployGistBoardFixture);
      const tx = await gistBoard.createGist(defaultText, defaultLat, defaultLng, defaultCategory, oneHour);
      const block = await ethers.provider.getBlock(tx.blockNumber);
      const expiresAt = block.timestamp + oneHour;

      await expect(tx)
        .to.emit(gistBoard, "GistCreated")
        .withArgs(0, owner.address, defaultLat, defaultLng, defaultCategory, expiresAt);
    });

    it("Should revert if the duration is too short", async function () {
      const { gistBoard } = await loadFixture(deployGistBoardFixture);
      const shortDuration = 59; // Less than 60 seconds
      await expect(
        gistBoard.createGist(defaultText, defaultLat, defaultLng, defaultCategory, shortDuration)
      ).to.be.revertedWithCustomError(gistBoard, "InvalidDuration");
    });
  });

  describe("Gist Expiry and Retrieval", function () {
    it("Should allow retrieval of a non-expired Gist", async function () {
      const { gistBoard } = await loadFixture(deployGistBoardFixture);
      await gistBoard.createGist(defaultText, defaultLat, defaultLng, defaultCategory, oneHour);
      
      const gist = await gistBoard.getGist(0);
      expect(gist.id).to.equal(0);
      expect(gist.text).to.equal(defaultText);
    });

    it("Should revert when trying to get an expired Gist", async function () {
      const { gistBoard } = await loadFixture(deployGistBoardFixture);
      await gistBoard.createGist(defaultText, defaultLat, defaultLng, defaultCategory, oneHour);

      // Use Hardhat's time helper to fast-forward time by 1 hour + 1 second
      await time.increase(oneHour + 1);

      // Now, trying to get the gist should fail because it's expired
      await expect(gistBoard.getGist(0)).to.be.revertedWithCustomError(
        gistBoard,
        "GistExpired"
      );
    });

    it("Should revert with GistNotFound for a non-existent Gist", async function () {
        const { gistBoard } = await loadFixture(deployGistBoardFixture);
        await expect(gistBoard.getGist(999)).to.be.revertedWithCustomError(
            gistBoard,
            "GistNotFound"
        );
    });
  });
});
