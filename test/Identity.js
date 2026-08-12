const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("Identity", function () {
  async function deployIdentityFixture() {
    const [alice, bob] = await ethers.getSigners();
    const Identity = await ethers.getContractFactory("Identity");
    const identity = await Identity.deploy();
    return { identity, alice, bob };
  }

  it("registers a new user", async function () {
    const { identity, alice } = await loadFixture(deployIdentityFixture);

    await expect(identity.connect(alice).register())
      .to.emit(identity, "UserRegistered")
      .withArgs(alice.address);

    expect(await identity.isRegistered(alice.address)).to.equal(true);
  });

  it("reverts when a user registers twice", async function () {
    const { identity, alice } = await loadFixture(deployIdentityFixture);

    await identity.connect(alice).register();
    await expect(identity.connect(alice).register()).to.be.revertedWith(
      "User already registered."
    );
  });

  it("reports unregistered users as not registered", async function () {
    const { identity, bob } = await loadFixture(deployIdentityFixture);
    expect(await identity.isRegistered(bob.address)).to.equal(false);
  });
});
