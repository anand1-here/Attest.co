// Deploys the contract to RPC_URL and writes deployment.json (the single source
// of truth for the contract address; CONTRACT_ADDRESS in backend/.env overrides it).
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const root = path.join(__dirname, "..");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

async function main() {
  const artifactPath = path.join(root, "artifacts", "EvidenceChain.json");
  if (!fs.existsSync(artifactPath)) throw new Error("Run `npm run compile` first");
  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = process.env.CHAIN_PRIVATE_KEY
    ? new ethers.Wallet(process.env.CHAIN_PRIVATE_KEY, provider)
    : provider.getSigner(0);

  // Keep the existing contract (and all its evidence) if it is still on this chain.
  if (!process.env.FORCE_DEPLOY && fs.existsSync(path.join(root, "deployment.json"))) {
    const existing = JSON.parse(fs.readFileSync(path.join(root, "deployment.json"), "utf8")).address;
    if ((await provider.getCode(existing)) !== "0x") {
      console.log("EvidenceChain already deployed at", existing, "- keeping it");
      return;
    }
  }
  
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.deployed();

  fs.writeFileSync(
    path.join(root, "deployment.json"),
    JSON.stringify({ address: contract.address, rpcUrl: RPC_URL }, null, 2)
  );
  console.log("EvidenceChain deployed at", contract.address, "-> deployment.json");
}

main().catch((e) => {
  console.error("Deploy failed:", e.message);
  process.exit(1);
});
