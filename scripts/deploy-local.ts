import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const signers = await ethers.getSigners();
  const [admin, manufacturer, logistics, tester, regulator] = signers;

  console.log("Deploying PharmaChain to localhost...\n");
  console.log("Deployer (admin):", admin.address);

  // Deploy contract
  const PharmaChain = await ethers.getContractFactory("PharmaChain");
  const pharmaChain = await PharmaChain.deploy();
  await pharmaChain.waitForDeployment();

  const contractAddress = await pharmaChain.getAddress();
  console.log("\nPharmaChain deployed to:", contractAddress);

  // Read role hashes from contract
  const MANUFACTURER_ROLE = await pharmaChain.MANUFACTURER_ROLE();
  const LOGISTICS_ROLE = await pharmaChain.LOGISTICS_ROLE();
  const TESTER_ROLE = await pharmaChain.TESTER_ROLE();
  const REGULATOR_ROLE = await pharmaChain.REGULATOR_ROLE();

  // Grant roles
  console.log("\nAssigning roles...");

  await (await pharmaChain.grantRole(MANUFACTURER_ROLE, manufacturer.address)).wait();
  await (await pharmaChain.grantRole(LOGISTICS_ROLE, logistics.address)).wait();
  await (await pharmaChain.grantRole(TESTER_ROLE, tester.address)).wait();
  await (await pharmaChain.grantRole(REGULATOR_ROLE, regulator.address)).wait();

  // Write frontend .env
  const frontendDir = path.resolve(__dirname, "../frontend");
  const envPath = path.join(frontendDir, ".env");
  fs.writeFileSync(envPath, `VITE_CONTRACT_ADDRESS=${contractAddress}\n`);
  console.log(`\nWrote ${envPath}`);

  // Extract ABI and write to frontend
  const artifactPath = path.resolve(
    __dirname,
    "../contracts/artifacts/contracts/PharmaChain.sol/PharmaChain.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error(
      "\nArtifact not found at:",
      artifactPath,
      "\nRun `npm run compile` first."
    );
    process.exitCode = 1;
    return;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
  const abiDir = path.join(frontendDir, "src/lib");
  fs.mkdirSync(abiDir, { recursive: true });
  const abiPath = path.join(abiDir, "PharmaChain.abi.json");
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2) + "\n");
  console.log(`Wrote ${abiPath}`);

  // Print summary table
  console.log("\n" + "=".repeat(72));
  console.log(" PharmaChain Local Deployment Summary");
  console.log("=".repeat(72));
  console.log("");
  console.log(
    `  ${"Role".padEnd(16)} ${"Address".padEnd(44)} Signer`
  );
  console.log(`  ${"-".repeat(16)} ${"-".repeat(44)} ${"-".repeat(8)}`);
  console.log(
    `  ${"Admin".padEnd(16)} ${admin.address.padEnd(44)} [0]`
  );
  console.log(
    `  ${"Manufacturer".padEnd(16)} ${manufacturer.address.padEnd(44)} [1]`
  );
  console.log(
    `  ${"Logistics".padEnd(16)} ${logistics.address.padEnd(44)} [2]`
  );
  console.log(
    `  ${"Tester".padEnd(16)} ${tester.address.padEnd(44)} [3]`
  );
  console.log(
    `  ${"Regulator".padEnd(16)} ${regulator.address.padEnd(44)} [4]`
  );
  console.log("");
  console.log(`  Contract: ${contractAddress}`);
  console.log("=".repeat(72));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
