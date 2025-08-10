const { expect } = require("chai");
const { filterGists } = require("../scripts/filterGists");

describe("Gist Filtering Script", function () {
    const now = Math.floor(Date.now() / 1000);
    const userLocation = { lat: 9.0765, lng: 7.3986 };
    const searchRadiusKm = 10;

    // Define mock gists for various scenarios
    const mockGists = [
        // #1: Nearby and active (should be included)
        { id: 1, message: "Nearby, active", lat: 9.07, lon: 7.40, expiration: now + 3600 },
        // #2: Nearby but expired (should be excluded)
        { id: 2, message: "Nearby, expired", lat: 9.08, lon: 7.39, expiration: now - 3600 },
        // #3: Active but too far (should be excluded)
        { id: 3, message: "Far, active", lat: 6.52, lon: 3.37, expiration: now + 3600 }, // Lagos
        // #4: Far and expired (should be excluded)
        { id: 4, message: "Far, expired", lat: 6.53, lon: 3.38, expiration: now - 3600 },
    ];

    it("should only return gists that are active and within the radius", function () {
        const filtered = filterGists(mockGists, userLocation, searchRadiusKm);

        // Assertions
        expect(filtered).to.have.lengthOf(1);
        expect(filtered[0].id).to.equal(1);
        expect(filtered[0].message).to.equal("Nearby, active");
    });

    it("should return an empty array if no gists match", function () {
        const noMatchingGists = [mockGists[2], mockGists[3]];
        const filtered = filterGists(noMatchingGists, userLocation, searchRadiusKm);

        expect(filtered).to.be.an('array').that.is.empty;
    });

    it("should return an empty array if all nearby gists are expired", function () {
        const allExpiredGists = [mockGists[1]]; // Only the nearby, expired gist
        const filtered = filterGists(allExpiredGists, userLocation, searchRadiusKm);

        expect(filtered).to.be.an('array').that.is.empty;
    });

    it("should handle an empty input array gracefully", function () {
        const filtered = filterGists([], userLocation, searchRadiusKm);
        expect(filtered).to.be.an('array').that.is.empty;
    });
});