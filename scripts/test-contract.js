// Contract tests. Needs a running local chain (`npm run chain`) and a compiled contract.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

(async () => {
  const { abi, bytecode } = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "artifacts", "EvidenceChain.json"), "utf8")
  );
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
  const c = await new ethers.ContractFactory(abi, bytecode, provider.getSigner(0)).deploy();
  await c.deployed();

  await (await c.addEvidence("CASE-1", "EV-1", "abc123", "42")).wait();
  const e = await c.getEvidence("EV-1");
  assert.strictEqual(e.evidenceId, "EV-1");
  assert.strictEqual(e.submitter, "42");
  assert.strictEqual(await c.getEvidenceHash("EV-1"), "abc123");
  console.log("ok  stores evidence and submitter");

  await assert.rejects(c.addEvidence("CASE-1", "EV-1", "zzz", "42"), /already exists/);
  console.log("ok  rejects duplicate evidence ID");

  await assert.rejects(c.getEvidenceHash("NOPE"), /not found/);
  console.log("ok  reverts for unknown evidence");

  const events = await c.queryFilter(c.filters.EvidenceAdded());
  assert.strictEqual(events[0].args.evidenceId, "EV-1");
  console.log("ok  event carries the real evidence ID");
  console.log("All contract tests passed");
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
