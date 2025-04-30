const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Identity contract
  const Identity = await ethers.getContractFactory("Identity");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  console.log("✅ Identity Contract Deployed at:", await identity.getAddress());

  // Deploy Job contract
  const Job = await ethers.getContractFactory("Job");
  const job = await Job.deploy();
  await job.waitForDeployment();
  console.log("✅ Job Contract Deployed at:", await job.getAddress());


  const Reputation = await ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  console.log("✅ Reputation Contract Deployed at:", await reputation.getAddress());

  // Deploy Escrow contract
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(deployer.address, { value: ethers.parseEther("0.01") });
  await escrow.waitForDeployment();
  console.log("✅ Escrow Contract Deployed at:", await escrow.getAddress());

  // Post demo jobs to Job contract
  console.log("📃 Posting demo jobs...");
  const demoJobs = [
    { description: "Build a landing page", budget: ethers.parseEther("0.1") },
    { description: "Develop a smart contract", budget: ethers.parseEther("0.2") },
    { description: "Design a logo", budget: ethers.parseEther("0.05") },
    { description: "Write a blog post", budget: ethers.parseEther("0.01") },
    { description: "Create an API integration", budget: ethers.parseEther("0.15") },
  ];
  for (const { description, budget } of demoJobs) {
    const tx = await job.postJob(description, budget);
    await tx.wait();
    console.log(`✅ Demo job posted: ${description}`);
  }

  // Save deployed addresses to a file for frontend use
  const fs = require("fs");
  const addresses = {
    identity: await identity.getAddress(),
    job: await job.getAddress(),
    reputation: await reputation.getAddress(),
    escrow: await escrow.getAddress(),
  };
  fs.writeFileSync("deployed-addresses.json", JSON.stringify(addresses, null, 2));
  console.log("📝 Contract addresses saved to deployed-addresses.json");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
