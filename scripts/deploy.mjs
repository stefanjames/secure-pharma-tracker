import hre from "hardhat";

async function main() {
  console.log("Deploying PharmaChain contract...");

  // Get the contract factory
  const PharmaChain = await hre.ethers.getContractFactory("PharmaChain");

  // Deploy the contract
  const pharmaChain = await PharmaChain.deploy();

  await pharmaChain.waitForDeployment();

  const contractAddress = await pharmaChain.getAddress();
  console.log("PharmaChain deployed to:", contractAddress);

  // Create some sample data for testing
  console.log("Creating sample batch...");
  
  const tx1 = await pharmaChain.createBatch(
    "BATCH001",
    "Aspirin 100mg",
    "PharmaCorp Ltd",
    1000,
    "2024-01-15",
    "2026-01-15",
    "New York, USA"
  );
  await tx1.wait();

  const tx2 = await pharmaChain.addQualityTest(
    "BATCH001",
    "Purity Test",
    "PASSED",
    "QA-001"
  );
  await tx2.wait();

  console.log("Sample data created successfully!");
  console.log("\n=== Setup Complete ===");
  console.log(`Contract Address: ${contractAddress}`);
  console.log("Network: Hardhat Local (Chain ID: 31337)");
  console.log("RPC URL: http://127.0.0.1:8545");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });