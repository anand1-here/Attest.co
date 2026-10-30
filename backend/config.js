const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const required = ["DB_PASSWORD", "JWT_SECRET"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(", ")}. Copy backend/.env.example to backend/.env.`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}

const root = path.join(__dirname, "..");

function contractAddress() {
  if (process.env.CONTRACT_ADDRESS) return process.env.CONTRACT_ADDRESS;
  const f = path.join(root, "deployment.json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8")).address;
  return null;
}

module.exports = {
  root,
  port: Number(process.env.PORT || 5001),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((s) => s.trim()),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  rpcUrl: process.env.RPC_URL || "http://127.0.0.1:8545",
  chainPrivateKey: process.env.CHAIN_PRIVATE_KEY || null,
  contractAddress,
  artifactPath: path.join(root, "artifacts", "EvidenceChain.json"),
  pythonBin: process.env.PYTHON_BIN || "python3",
  deepfakeEnabled: process.env.DEEPFAKE_ENABLED !== "false",
  analyzeScript: path.join(root, "deepfake", "analyze.py"),
  uploadDir: path.join(__dirname, "uploads"),
};
