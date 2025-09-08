const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Deploy the contract
  const PharmaChain = await ethers.getContractFactory("PharmaChain");
  const contract = await PharmaChain.deploy();
  
  console.log("Waiting for deployment...");
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`✅ PharmaChain deployed to: ${address}`);
  console.log(`📝 Update your contract address to: ${address}`);
  console.log("🔗 Network: Hardhat Local (Chain ID: 31337)");
  console.log("🌐 RPC URL: http://127.0.0.1:8545");
  
  return address;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = main;