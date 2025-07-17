const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GistBoard", function () {
  // We define a fixture to reuse the same setup in every test.
  // This deploys the contract once, saving time.
  async function deployGistBoardFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const GistBoard = await ethers.getContractFactory("GistBoard");
    const gistBoard = await GistBoard.deploy();

    return { gistBoard, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the total gists to 0 initially", async function () {
      const { gistBoard } = await loadFixture(deployGistBoardFixture);
      expect(await gistBoard.getTotalGists()).to.equal(0);
    });
  });

  describe("Gist Creation", function () {
    it("Should allow a user to create a Gist", async function () {
      const { gistBoard, owner } = await loadFixture(deployGistBoardFixture);

      const lat = 34052235; // 34.052235
      const lng = -118243683; // -118.243683
      const text = "Hello, world!";
      const category = "story";

      // Call the createGist function and wait for the transaction to be mined
      await gistBoard.createGist(text, lat, lng, category);

      // Check that the total number of gists has increased to 1
      expect(await gistBoard.getTotalGists()).to.equal(1);

      // Retrieve the newly created gist from the public mapping
      const newGist = await gistBoard.gists(0);

      // Verify the details of the created gist
      expect(newGist.id).to.equal(0);
      expect(newGist.creator).to.equal(owner.address);
      expect(newGist.text).to.equal(text);
      expect(newGist.latitude).to.equal(lat);
      expect(newGist.longitude).to.equal(lng);
      expect(newGist.category).to.equal(category);
    });

    it("Should emit a GistCreated event on successful creation", async function () {
      const { gistBoard, owner } = await loadFixture(deployGistBoardFixture);

      const lat = 34052235;
      const lng = -118243683;
      const text = "Another Gist!";
      const category = "alert";

      // We expect the transaction to emit the 'GistCreated' event
      // with the correct arguments.
      await expect(gistBoard.createGist(text, lat, lng, category))
        .to.emit(gistBoard, "GistCreated")
        .withArgs(0, owner.address, lat, lng, category);
    });

    it("Should revert if the gist text is empty", async function () {
      const { gistBoard } = await loadFixture(deployGistBoardFixture);

      // We expect the transaction to fail (revert) with a specific error message.
      await expect(
        gistBoard.createGist("", 1, 1, "tip")
      ).to.be.revertedWith("Gist text cannot be empty.");
    });
  });
});
