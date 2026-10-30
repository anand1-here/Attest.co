const crypto = require("crypto");

const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, "");
const rand = (bytes) => crypto.randomBytes(bytes).toString("hex").toUpperCase();

// e.g. CASE-20261030-A3F9   /   EV-20261030-7C21D9E4
const newCaseId = () => `CASE-${stamp()}-${rand(2)}`;
const newEvidenceId = () => `EV-${stamp()}-${rand(4)}`;

module.exports = { newCaseId, newEvidenceId };