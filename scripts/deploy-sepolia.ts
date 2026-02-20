import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  // Network guard
  if (network.name !== "sepolia") {
    console.error(
      `Error: This script must be run with --network sepolia (current: ${network.name})`
    );
    process.exitCode = 1;
    return;
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deploying PharmaChain to Sepolia...\n");
  console.log("  Deployer:", deployer.address);
  console.log("  Balance: ", ethers.formatEther(balance), "ETH\n");

  // Deploy contract
  const PharmaChain = await ethers.getContractFactory("PharmaChain");
  const pharmaChain = await PharmaChain.deploy();
  await pharmaChain.waitForDeployment();

  const contractAddress = await pharmaChain.getAddress();
  console.log("PharmaChain deployed to:", contractAddress);

  // Wait for Etherscan indexing
  console.log("\nWaiting 30s for Etherscan to index the contract...");
  await new Promise((resolve) => setTimeout(resolve, 30_000));

  // Verify on Etherscan
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
    });
    console.log("Contract verified on Etherscan!");
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("already verified")) {
      console.log("Contract is already verified on Etherscan.");
    } else {
      console.error("Etherscan verification failed:", error.message);
      console.log(
        `\nManual verify command:\n  npx hardhat verify --network sepolia ${contractAddress}`
      );
    }
  }

  // Write frontend .env
  const frontendDir = path.resolve(__dirname, "../frontend");
  const envPath = path.join(frontendDir, ".env");
  fs.writeFileSync(envPath, `VITE_CONTRACT_ADDRESS=${contractAddress}\n`);
  console.log(`\nWrote ${envPath}`);

  // Update root .env
  const rootEnvPath = path.resolve(__dirname, "../.env");
  let rootEnv = "";
  if (fs.existsSync(rootEnvPath)) {
    rootEnv = fs.readFileSync(rootEnvPath, "utf-8");
  }

  if (rootEnv.includes("CONTRACT_ADDRESS=")) {
    rootEnv = rootEnv.replace(
      /CONTRACT_ADDRESS=.*/,
      `CONTRACT_ADDRESS=${contractAddress}`
    );
  } else {
    rootEnv = rootEnv.trimEnd() + `\nCONTRACT_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(rootEnvPath, rootEnv);
  console.log(`Updated ${rootEnvPath} with CONTRACT_ADDRESS`);

  // Extract ABI and write to frontend
  const artifactPath = path.resolve(
    __dirname,
    "../contracts/artifacts/contracts/PharmaChain.sol/PharmaChain.json"
  );

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abiDir = path.join(frontendDir, "src/lib");
    fs.mkdirSync(abiDir, { recursive: true });
    const abiPath = path.join(abiDir, "PharmaChain.abi.json");
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2) + "\n");
    console.log(`Wrote ${abiPath}`);
  }

  // Print summary
  console.log("\n" + "=".repeat(72));
  console.log(" Sepolia Deployment Complete");
  console.log("=".repeat(72));
  console.log(`\n  Contract: ${contractAddress}`);
  console.log(
    `  Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`
  );
  console.log("\n  Next steps:");
  console.log("    1. Run `npm run grant-roles` to assign roles");
  console.log("    2. Run `npm run dev` to start the frontend");
  console.log("=".repeat(72));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
