# Attest

Chain of custody for video evidence. Every upload is SHA-256 hashed and recorded on a blockchain
(with the submitting user), automatically screened for deepfakes, and can later be re-verified
against the chain to detect tampering.

**Flow:** register / log in -> upload video (Case ID + Evidence ID) -> hash written to the chain ->
deepfake verdict appears on the same page -> Verify page proves a file is unchanged -> View Records
shows everything.

## Layout

| Path | What it is |
|---|---|
| `contracts/EvidenceChain.sol` | Smart contract (evidence ID, case, hash, submitter, timestamp) |
| `scripts/` | `compile.js`, `deploy.js`, `test-contract.js` |
| `backend/` | Express API: `routes/auth.js`, `routes/evidence.js`, `routes/deepfake.js`, `chain.js`, `schema.sql` |
| `deepfake/analyze.py` | Standalone deepfake analyzer (prints JSON) |
| `frontend/` | React app |
| `start.sh` | Starts chain, deploys contract, starts backend and frontend |

See **SETUP.md** to run it.
