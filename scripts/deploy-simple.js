import { ethers } from "hardhat";

export async function main() {
  console.log("Deploying SimplePharmaChain smart contract...");
  
  // Get the signers
  const [deployer, user1, user2] = await ethers.getSigners();
  
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
  
  // Deploy the contract
  const SimplePharmaChain = await ethers.getContractFactory("SimplePharmaChain");
  const pharmaChain = await SimplePharmaChain.deploy();
  
  await pharmaChain.waitForDeployment();
  const contractAddress = await pharmaChain.getAddress();
  
  console.log("SimplePharmaChain deployed to:", contractAddress);
  
  // Create some test batches for comparison
  console.log("\nCreating test batches for blockchain explorer comparison...");
  
  const testBatches = [
    {
      batchId: "BATCH-EXPLORER-001",
      productName: "Aspirin 100mg Tablets",
      manufacturer: "PharmaTest Corp",
      manufacturerLicenseId: "MFG-TEST-001",
      lotNumber: "LOT-2025-001",
      quantity: 10000,
      manufacturingDate: "2025-01-21",
      expiryDate: "2026-01-21",
      location: "Manufacturing Plant A",
      temperatureSensitive: false,
      storageConditions: "Store at room temperature"
    },
    {
      batchId: "BATCH-EXPLORER-002", 
      productName: "Insulin Injection 100IU/ml",
      manufacturer: "BioPharma Labs",
      manufacturerLicenseId: "MFG-BIO-002",
      lotNumber: "INS-2025-0121",
      quantity: 5000,
      manufacturingDate: "2025-01-21",
      expiryDate: "2025-07-21",
      location: "Cold Storage Facility B",
      temperatureSensitive: true,
      storageConditions: "Store at 2-8°C"
    }
  ];
  
  for (const batch of testBatches) {
    try {
      console.log(`Creating batch: ${batch.batchId}`);
      const tx = await pharmaChain.createBatch(
        batch.batchId,
        batch.productName,
        batch.manufacturer,
        batch.manufacturerLicenseId,
        batch.lotNumber,
        batch.quantity,
        batch.manufacturingDate,
        batch.expiryDate,
        batch.location,
        batch.temperatureSensitive,
        batch.storageConditions
      );
      
      const receipt = await tx.wait();
      console.log(`  ✅ Created with tx hash: ${receipt.hash}`);
      console.log(`  📦 Block number: ${receipt.blockNumber}`);
      console.log(`  ⛽ Gas used: ${receipt.gasUsed.toString()}`);
      
      // Add quality tests
      console.log(`  Adding quality test for ${batch.batchId}`);
      const testTx = await pharmaChain.addQualityTest(
        batch.batchId,
        "Purity Test",
        "PASSED",
        "QA-TESTER-001"
      );
      
      const testReceipt = await testTx.wait();
      console.log(`  ✅ Quality test added with tx hash: ${testReceipt.hash}`);
      
    } catch (error) {
      console.log(`  ❌ Failed to create batch ${batch.batchId}:`, error.message);
    }
  }
  
  // Update batch status
  console.log("\nUpdating batch statuses...");
  try {
    const statusTx = await pharmaChain.updateBatchStatus("BATCH-EXPLORER-001", 1); // IN_TRANSIT
    const statusReceipt = await statusTx.wait();
    console.log(`✅ Updated BATCH-EXPLORER-001 status with tx hash: ${statusReceipt.hash}`);
  } catch (error) {
    console.log("❌ Failed to update batch status:", error.message);
  }
  
  // Get final contract state
  console.log("\n📊 Contract State Summary:");
  const batchCount = await pharmaChain.getBatchCount();
  console.log(`Total batches created: ${batchCount.toString()}`);
  
  const batch1 = await pharmaChain.getBatch("BATCH-EXPLORER-001");
  console.log(`BATCH-EXPLORER-001 status: ${batch1.status} (${getStatusName(batch1.status)})`);
  
  const qualityTests = await pharmaChain.getQualityTests("BATCH-EXPLORER-001");
  console.log(`BATCH-EXPLORER-001 quality tests: ${qualityTests.length}`);
  
  console.log(`\n🔗 Contract deployed at: ${contractAddress}`);
  console.log(`🌐 Network: Hardhat Local (Chain ID: 31337)`);
  console.log(`👤 Deployer: ${deployer.address}`);
  
  return {
    contractAddress,
    deployerAddress: deployer.address,
    testBatches: testBatches.map(b => b.batchId)
  };
}

function getStatusName(status) {
  const statuses = ["MANUFACTURED", "IN_TRANSIT", "DELIVERED", "RECALLED"];
  return statuses[status] || "UNKNOWN";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((result) => {
      console.log("\n✅ Deployment completed successfully!");
      console.log("Result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}