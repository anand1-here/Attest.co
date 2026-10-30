const fs = require("fs");
const { ethers } = require("ethers");
const config = require("./config");

let cached = null;

function getContract() {
  const address = config.contractAddress();
  if (!address) throw new Error("No contract deployed. Run `npm run compile && npm run deploy`.");
  if (cached && cached.address === address) return cached.contract;

  const { abi } = JSON.parse(fs.readFileSync(config.artifactPath, "utf8"));
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const signer = config.chainPrivateKey ? new ethers.Wallet(config.chainPrivateKey, provider) : provider.getSigner(0);
  const contract = new ethers.Contract(address, abi, signer);
  cached = { address, contract };
  return contract;
}

const reasonOf = (e) => String(e.reason || e.error?.message || e.message || e);

async function addEvidence(caseId, evidenceId, hash, submitter) {
  try {
    const tx = await getContract().addEvidence(caseId, evidenceId, hash, String(submitter));
    const receipt = await tx.wait();
    return { txHash: receipt.transactionHash, blockNumber: receipt.blockNumber };
  } catch (e) {
    const msg = reasonOf(e);
    if (msg.includes("Evidence already exists")) {
      const err = new Error("Evidence already exists on the blockchain");
      err.code = "CHAIN_DUPLICATE";
      throw err;
    }
    const err = new Error("Blockchain transaction failed: " + msg);
    err.code = "CHAIN_ERROR";
    throw err;
  }
}

// Returns null if the evidence is not on chain.
async function getEvidence(evidenceId) {
  try {
    const r = await getContract().getEvidence(evidenceId);
    return {
      caseId: r.caseId,
      evidenceId: r.evidenceId,
      hash: r.hash,
      submitter: r.submitter,
      timestamp: r.timestamp.toNumber(),
    };
  } catch (e) {
    if (reasonOf(e).includes("Evidence not found")) return null;
    const err = new Error("Blockchain unavailable: " + reasonOf(e));
    err.code = "CHAIN_ERROR";
    throw err;
  }
}

async function health() {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const block = await provider.getBlockNumber();
  const address = config.contractAddress();
  const code = address ? await provider.getCode(address) : "0x";
  return { connected: true, block, contractAddress: address, contractDeployed: code !== "0x" };
}

module.exports = { addEvidence, getEvidence, health };
