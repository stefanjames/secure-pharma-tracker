import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

interface RoleAssignment {
  name: string;
  envVar: string;
  cliFlag: string;
  roleGetter: string;
}

const ROLES: RoleAssignment[] = [
  {
    name: "Manufacturer",
    envVar: "MANUFACTURER_ADDRESS",
    cliFlag: "--manufacturer",
    roleGetter: "MANUFACTURER_ROLE",
  },
  {
    name: "Logistics",
    envVar: "LOGISTICS_ADDRESS",
    cliFlag: "--logistics",
    roleGetter: "LOGISTICS_ROLE",
  },
  {
    name: "Tester",
    envVar: "TESTER_ADDRESS",
    cliFlag: "--tester",
    roleGetter: "TESTER_ROLE",
  },
  {
    name: "Regulator",
    envVar: "REGULATOR_ADDRESS",
    cliFlag: "--regulator",
    roleGetter: "REGULATOR_ROLE",
  },
];

function getCliArg(flag: string): string | undefined {
  const args = process.argv;
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

async function main() {
  // Resolve contract address: CLI arg > env var
  const contractAddress =
    getCliArg("--contract") || process.env.CONTRACT_ADDRESS;

  if (!contractAddress) {
    console.error(
      "Error: No contract address provided.\n" +
        "  Set CONTRACT_ADDRESS env var or pass --contract 0x..."
    );
    process.exitCode = 1;
    return;
  }

  console.log("Granting roles on PharmaChain at:", contractAddress, "\n");

  const pharmaChain = await ethers.getContractAt(
    "PharmaChain",
    contractAddress
  );
  const [deployer] = await ethers.getSigners();

  // Verify deployer has admin role
  const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
  const isAdmin = await pharmaChain.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  if (!isAdmin) {
    console.error(
      `Error: Deployer ${deployer.address} does not have DEFAULT_ADMIN_ROLE on this contract.`
    );
    process.exitCode = 1;
    return;
  }

  console.log("Admin:", deployer.address, "\n");

  const results: { name: string; address: string; status: string }[] = [];

  for (const role of ROLES) {
    // CLI args override env vars
    const address = getCliArg(role.cliFlag) || process.env[role.envVar];

    if (!address) {
      results.push({ name: role.name, address: "-", status: "skipped (no address)" });
      continue;
    }

    const roleHash: string = await (pharmaChain as any)[role.roleGetter]();
    const alreadyHasRole = await pharmaChain.hasRole(roleHash, address);

    if (alreadyHasRole) {
      results.push({ name: role.name, address, status: "skipped (already granted)" });
    } else {
      await (await pharmaChain.grantRole(roleHash, address)).wait();
      results.push({ name: role.name, address, status: "granted" });
    }
  }

  // Print summary
  console.log("=".repeat(72));
  console.log(" Role Assignment Summary");
  console.log("=".repeat(72));
  console.log("");
  console.log(
    `  ${"Role".padEnd(16)} ${"Address".padEnd(44)} Status`
  );
  console.log(`  ${"-".repeat(16)} ${"-".repeat(44)} ${"-".repeat(24)}`);
  for (const r of results) {
    console.log(
      `  ${r.name.padEnd(16)} ${r.address.padEnd(44)} ${r.status}`
    );
  }
  console.log("=".repeat(72));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
