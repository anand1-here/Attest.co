// Compiles contracts/EvidenceChain.sol with the solc npm package (no network needed)
// and writes artifacts/EvidenceChain.json  ({ abi, bytecode }).
const fs = require("fs");
const path = require("path");
const solc = require("solc");

const root = path.join(__dirname, "..");
const file = "EvidenceChain.sol";
const source = fs.readFileSync(path.join(root, "contracts", file), "utf8");

const output = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { [file]: { content: source } },
      settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
    })
  )
);

const errors = (output.errors || []).filter((e) => e.severity === "error");
if (errors.length) {
  errors.forEach((e) => console.error(e.formattedMessage));
  process.exit(1);
}

const c = output.contracts[file].EvidenceChain;
fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
fs.writeFileSync(
  path.join(root, "artifacts", "EvidenceChain.json"),
  JSON.stringify({ abi: c.abi, bytecode: "0x" + c.evm.bytecode.object }, null, 2)
);
console.log("Compiled -> artifacts/EvidenceChain.json");
