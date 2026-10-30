#!/usr/bin/env bash
# One command to run everything locally: chain -> deploy -> backend -> frontend.
# First time? Follow SETUP.md (install deps, create backend/.env, init the DB).
set -e
cd "$(dirname "$0")"

[ -f backend/.env ] || { echo "backend/.env missing. Copy backend/.env.example to backend/.env and fill it in."; exit 1; }
[ -d node_modules ] || { echo "Run: npm run install:all"; exit 1; }

pids=()
cleanup() { echo; echo "Stopping..."; kill "${pids[@]}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "Starting local blockchain on :8545 (data kept in chain-data/)"
npm run --silent chain > chain.log 2>&1 &
pids+=($!)
for i in $(seq 1 30); do
  curl -s -X POST localhost:8545 -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber"}' >/dev/null 2>&1 && break
  sleep 1
done

npm run --silent compile
npm run --silent deploy

echo "Starting backend on :5001"
npm --prefix backend start &
pids+=($!)

echo "Starting frontend on :3000"
BROWSER=none npm --prefix frontend start &
pids+=($!)

wait
