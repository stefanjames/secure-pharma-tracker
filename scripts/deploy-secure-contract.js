import { ethers } from "hardhat";

export async function main() {
  console.log("Deploying PharmaChain smart contract with access controls...");
  
  // Get the signers
  const [deployer, manufacturer, distributor, qa, regulator, auditor] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy the contract
  const PharmaChain = await ethers.getContractFactory("PharmaChain");
  const pharmaChain = await PharmaChain.deploy();
  
  await pharmaChain.deployed();
  
  console.log("PharmaChain deployed to:", pharmaChain.address);
  
  // Set up initial roles
  console.log("\nSetting up role-based access controls...");
  
  // Verify manufacturer
  console.log("Verifying manufacturer:", manufacturer.address);
  await pharmaChain.verifyManufacturer(manufacturer.address);
  
  // Verify distributor
  console.log("Verifying distributor:", distributor.address);
  await pharmaChain.verifyDistributor(distributor.address);
  
  // Grant QA role
  console.log("Granting QA role to:", qa.address);
  await pharmaChain.verifyQAPersonnel(qa.address);
  
  // Grant regulator role (additional regulator)
  console.log("Granting regulator role to:", regulator.address);
  const REGULATOR_ROLE = await pharmaChain.REGULATOR_ROLE();
  await pharmaChain.grantRole(REGULATOR_ROLE, regulator.address);
  
  // Grant auditor role
  console.log("Granting auditor role to:", auditor.address);
  const AUDITOR_ROLE = await pharmaChain.AUDITOR_ROLE();
  await pharmaChain.grantRole(AUDITOR_ROLE, auditor.address);
  
  console.log("\nRole assignments completed:");
  console.log("- Deployer (Admin/Emergency):", deployer.address);
  console.log("- Manufacturer:", manufacturer.address);
  console.log("- Distributor:", distributor.address);
  console.log("- QA Personnel:", qa.address);
  console.log("- Regulator:", regulator.address);
  console.log("- Auditor:", auditor.address);
  
  // Test access controls
  console.log("\nTesting access controls...");
  
  try {
    // Test manufacturer batch creation (should succeed)
    console.log("Testing manufacturer batch creation...");
    await pharmaChain.connect(manufacturer).createBatch(
      "SECURE-BATCH-001",
      "Secure Aspirin 100mg",
      "SecurePharma Corp",
      "SEC-LIC-001",
      "SECURE-LOT-001",
      1000,
      "2025-01-21",
      "2026-01-21",
      "Secure Manufacturing Facility",
      false,
      "Room temperature storage"
    );
    console.log("✅ Manufacturer batch creation: SUCCESS");
  } catch (error) {
    console.log("❌ Manufacturer batch creation: FAILED -", error.message);
  }
  
  try {
    // Test unauthorized batch creation (should fail)
    console.log("Testing unauthorized batch creation...");
    await pharmaChain.connect(distributor).createBatch(
      "UNAUTHORIZED-BATCH",
      "Unauthorized Product",
      "Fake Corp",
      "FAKE-LIC",
      "FAKE-LOT",
      100,
      "2025-01-21",
      "2026-01-21",
      "Unauthorized Location",
      false,
      "Unknown storage"
    );
    console.log("❌ Unauthorized batch creation: UNEXPECTEDLY SUCCEEDED");
  } catch (error) {
    console.log("✅ Unauthorized batch creation: CORRECTLY BLOCKED -", error.message);
  }
  
  try {
    // Test QA quality test addition (should succeed)
    console.log("Testing QA quality test addition...");
    await pharmaChain.connect(qa).addQualityTest(
      "SECURE-BATCH-001",
      "Safety Test",
      "PASSED",
      "QA-TESTER-001"
    );
    console.log("✅ QA quality test addition: SUCCESS");
  } catch (error) {
    console.log("❌ QA quality test addition: FAILED -", error.message);
  }
  
  try {
    // Test unauthorized quality test (should fail)
    console.log("Testing unauthorized quality test addition...");
    await pharmaChain.connect(manufacturer).addQualityTest(
      "SECURE-BATCH-001",
      "Fake Test",
      "PASSED",
      "FAKE-TESTER"
    );
    console.log("❌ Unauthorized quality test: UNEXPECTEDLY SUCCEEDED");
  } catch (error) {
    console.log("✅ Unauthorized quality test: CORRECTLY BLOCKED -", error.message);
  }
  
  try {
    // Test regulator recall scheduling (should succeed)
    console.log("Testing regulator recall scheduling...");
    await pharmaChain.connect(regulator).scheduleRecall(
      "SECURE-BATCH-001",
      "Safety concern identified during post-market surveillance"
    );
    console.log("✅ Regulator recall scheduling: SUCCESS");
  } catch (error) {
    console.log("❌ Regulator recall scheduling: FAILED -", error.message);
  }
  
  console.log("\n🔒 Smart contract deployment and access control testing completed!");
  console.log("📝 Contract address for frontend configuration:", pharmaChain.address);
  
  return pharmaChain.address;
}

main()
  .then((contractAddress) => {
    console.log(`\n✅ Deployment successful! Contract address: ${contractAddress}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });