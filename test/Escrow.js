const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  async function deployEscrowFixture() {
    const [client, freelancer, other] = await ethers.getSigners();
    const amount = ethers.parseEther("1");
    const Escrow = await ethers.getContractFactory("Escrow");
    const escrow = await Escrow.connect(client).deploy(freelancer.address, { value: amount });
    return { escrow, client, freelancer, other, amount };
  }

  it("sets client, freelancer and deposited amount on deployment", async function () {
    const { escrow, client, freelancer, amount } = await loadFixture(deployEscrowFixture);

    expect(await escrow.client()).to.equal(client.address);
    expect(await escrow.freelancer()).to.equal(freelancer.address);
    expect(await escrow.amount()).to.equal(amount);
    expect(await escrow.jobCompleted()).to.equal(false);
  });

  it("only allows the client to mark the job completed", async function () {
    const { escrow, other } = await loadFixture(deployEscrowFixture);
    await expect(escrow.connect(other).markJobCompleted()).to.be.revertedWith(
      "Only client can call this."
    );
  });

  it("releases payment to the freelancer once completed", async function () {
    const { escrow, client, freelancer, amount } = await loadFixture(deployEscrowFixture);

    await escrow.connect(client).markJobCompleted();
    await expect(escrow.connect(client).releasePayment()).to.changeEtherBalances(
      [escrow, freelancer],
      [-amount, amount]
    );
  });

  it("reverts release if the job has not been marked completed", async function () {
    const { escrow, client } = await loadFixture(deployEscrowFixture);
    await expect(escrow.connect(client).releasePayment()).to.be.revertedWith(
      "Job not completed yet."
    );
  });
});
