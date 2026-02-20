import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

function getCliArg(flag: string): string | undefined {
  const args = process.argv;
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

async function main() {
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

  // Write frontend .env
  const frontendDir = path.resolve(__dirname, "../frontend");
  const envPath = path.join(frontendDir, ".env");
  fs.writeFileSync(envPath, `VITE_CONTRACT_ADDRESS=${contractAddress}\n`);
  console.log(`Wrote ${envPath}`);

  // Extract ABI from artifact
  const artifactPath = path.resolve(
    __dirname,
    "../contracts/artifacts/contracts/PharmaChain.sol/PharmaChain.json"
  );

  if (!fs.existsSync(artifactPath)) {
    console.error(
      `\nError: Artifact not found at:\n  ${artifactPath}\n\n` +
        "Run `npm run compile` first to generate contract artifacts."
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

  console.log("\nFrontend config generated successfully.");
  console.log(`  Contract address: ${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
