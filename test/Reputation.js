const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reputation", function () {
  async function deployReputationFixture() {
    const [client, freelancer, other] = await ethers.getSigners();
    const budget = ethers.parseEther("1");

    const Job = await ethers.getContractFactory("Job");
    const job = await Job.deploy();

    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy(await job.getAddress());

    return { job, reputation, client, freelancer, other, budget };
  }

  /// Posts, accepts, and pays out a job so it's eligible to be rated.
  async function completeJob(job, client, freelancer, budget, description = "Ship feature") {
    await job.connect(client).postJob(description, budget, { value: budget });
    const jobId = await job.jobCounter();
    await job.connect(freelancer).acceptJob(jobId);
    await job.connect(client).releaseFunds(jobId);
    return jobId;
  }

  it("rejects deployment with a zero Job contract address", async function () {
    const Reputation = await ethers.getContractFactory("Reputation");
    await expect(Reputation.deploy(ethers.ZeroAddress)).to.be.revertedWith(
      "Job contract address required."
    );
  });

  it("rejects ratings outside the 1-5 range", async function () {
    const { job, reputation, client, freelancer, budget } = await loadFixture(deployReputationFixture);
    const jobId = await completeJob(job, client, freelancer, budget);

    await expect(
      reputation.connect(client).rateFreelancer(jobId, 0)
    ).to.be.revertedWith("Invalid rating (1-5)");
    await expect(
      reputation.connect(client).rateFreelancer(jobId, 6)
    ).to.be.revertedWith("Invalid rating (1-5)");
  });

  it("rejects rating a job that does not exist", async function () {
    const { reputation, client } = await loadFixture(deployReputationFixture);
    await expect(reputation.connect(client).rateFreelancer(999, 5)).to.be.revertedWith(
      "Job does not exist."
    );
  });

  it("rejects rating from anyone other than the hiring client", async function () {
    const { job, reputation, client, freelancer, other, budget } = await loadFixture(deployReputationFixture);
    const jobId = await completeJob(job, client, freelancer, budget);

    await expect(
      reputation.connect(other).rateFreelancer(jobId, 5)
    ).to.be.revertedWith("Only the hiring client can rate this job.");
    await expect(
      reputation.connect(freelancer).rateFreelancer(jobId, 5)
    ).to.be.revertedWith("Only the hiring client can rate this job.");
  });

  it("rejects rating a job whose funds have not been released", async function () {
    const { job, reputation, client, freelancer, budget } = await loadFixture(deployReputationFixture);
    await job.connect(client).postJob("Unfinished job", budget, { value: budget });
    const jobId = await job.jobCounter();
    await job.connect(freelancer).acceptJob(jobId);

    await expect(
      reputation.connect(client).rateFreelancer(jobId, 5)
    ).to.be.revertedWith("Job is not completed and paid yet.");
  });

  it("rejects rating the same job twice", async function () {
    const { job, reputation, client, freelancer, budget } = await loadFixture(deployReputationFixture);
    const jobId = await completeJob(job, client, freelancer, budget);

    await reputation.connect(client).rateFreelancer(jobId, 4);
    await expect(
      reputation.connect(client).rateFreelancer(jobId, 5)
    ).to.be.revertedWith("Job already rated.");
  });

  it("emits FreelancerRated with the job id, client, freelancer, and rating", async function () {
    const { job, reputation, client, freelancer, budget } = await loadFixture(deployReputationFixture);
    const jobId = await completeJob(job, client, freelancer, budget);

    await expect(reputation.connect(client).rateFreelancer(jobId, 5))
      .to.emit(reputation, "FreelancerRated")
      .withArgs(jobId, client.address, freelancer.address, 5);
  });

  it("tracks completed jobs and average rating across multiple paid jobs", async function () {
    const { job, reputation, client, freelancer, budget } = await loadFixture(deployReputationFixture);

    const jobId1 = await completeJob(job, client, freelancer, budget, "Job one");
    await reputation.connect(client).rateFreelancer(jobId1, 4);

    const jobId2 = await completeJob(job, client, freelancer, budget, "Job two");
    await reputation.connect(client).rateFreelancer(jobId2, 5);

    const [averageRating, completedJobs] = await reputation.getReputation(freelancer.address);
    expect(completedJobs).to.equal(2);
    expect(averageRating).to.equal(4); // integer average of (4 + 5) / 2
  });

  it("returns zero reputation for a freelancer with no ratings", async function () {
    const { reputation, freelancer } = await loadFixture(deployReputationFixture);
    const [averageRating, completedJobs] = await reputation.getReputation(freelancer.address);
    expect(averageRating).to.equal(0);
    expect(completedJobs).to.equal(0);
  });

  it("stores and retrieves a freelancer's project link", async function () {
    const { reputation, freelancer } = await loadFixture(deployReputationFixture);

    await reputation.connect(freelancer).addProjectLink("https://github.com/example/project");
    expect(await reputation.getProjectLink(freelancer.address)).to.equal(
      "https://github.com/example/project"
    );
  });
});
