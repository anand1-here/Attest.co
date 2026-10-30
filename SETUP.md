# Setup

**Needs:** Node 18+ (Node 20 LTS recommended), PostgreSQL 14+, Python 3.10-3.12 (only for deepfake analysis).

## 1. Install
```bash
npm run install:all
python3 -m venv .venv && source .venv/bin/activate
pip install -r deepfake/requirements.txt        # TensorFlow is large; skip it and set DEEPFAKE_ENABLED=false to run without
```

## 2. Configure
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env`: set `DB_PASSWORD`, and a `JWT_SECRET` of 32+ random characters:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
If you used the venv above, set `PYTHON_BIN` to its full path (e.g. `/path/to/Attest/.venv/bin/python`).
The frontend reads `frontend/.env` (`REACT_APP_API_URL`, default `http://localhost:5001`).

## 3. Create the database
```bash
npm run db:init
```
Make an admin (optional): `npm --prefix backend run create-admin -- "Your Name" you@example.com 'a-strong-password'`

## 4. Run
```bash
./start.sh
```
Open http://localhost:3000, register, and upload a video.

## Checks
- `deepfake/analyze.py` alone: `python3 deepfake/analyze.py some_video.mp4`
- Contract tests (chain must be running): `npm run chain` in one terminal, then `npm test`
- Backend health: http://localhost:5001/health

## Notes
- The local chain is Hardhat's. Its accounts and contract address are the same on every fresh start, but
  **its data is lost on restart** and the database will still hold old records. After restarting the chain,
  either wipe the evidence table or deploy to a persistent network.
- The contract address comes from `backend/.env` `CONTRACT_ADDRESS` if set, else from `deployment.json`
  (written by `npm run deploy`). It is not hardcoded anywhere.
- To use a real network (e.g. Sepolia): set `RPC_URL`, `CHAIN_PRIVATE_KEY` (funded account), run `npm run deploy`.
- Uploaded videos live in `backend/uploads/` and are served only to logged-in users.
