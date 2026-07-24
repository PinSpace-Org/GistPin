#!/usr/bin/env bash
#
# Build, deploy and initialize GistRegistry on the Stellar testnet.
#
# Prerequisites:
#   - Rust with the wasm32 target:  rustup target add wasm32-unknown-unknown
#   - Stellar CLI:                  cargo install --locked stellar-cli --features opt
#   - A funded testnet identity:    stellar keys generate --global <name> --network testnet
#                                   stellar keys fund <name> --network testnet
#
# Usage:
#   ./scripts/deploy-testnet.sh <identity> [admin-address]
#
#   <identity>       stellar CLI identity used to sign the deploy (required)
#   [admin-address]  moderator address passed to initialize().
#                    Defaults to the deploying identity's own address.
#
# Example:
#   ./scripts/deploy-testnet.sh my-key
#
set -euo pipefail

NETWORK="testnet"
IDENTITY="${1:-}"
if [[ -z "$IDENTITY" ]]; then
  echo "error: missing <identity>." >&2
  echo "usage: $0 <identity> [admin-address]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

WASM="target/wasm32-unknown-unknown/release/gistpin_contracts.wasm"

echo "==> Running tests"
cargo test

echo "==> Building WASM (release)"
cargo build --target wasm32-unknown-unknown --release

echo "==> Optimizing"
stellar contract optimize --wasm "$WASM" || echo "(optimize unavailable — deploying unoptimized)"
OPTIMIZED="target/wasm32-unknown-unknown/release/gistpin_contracts.optimized.wasm"
[[ -f "$OPTIMIZED" ]] || OPTIMIZED="$WASM"

echo "==> Deploying to $NETWORK"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "==> Deployed: $CONTRACT_ID"

ADMIN="${2:-$(stellar keys address "$IDENTITY")}"
echo "==> Initializing moderator: $ADMIN"
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- initialize --admin "$ADMIN"

cat <<EOF

------------------------------------------------------------------
Deployment complete.

  Contract ID : $CONTRACT_ID
  Moderator   : $ADMIN
  Network     : $NETWORK

Next steps:
  1. Record the contract id in contracts/README.md (Deployments table).
  2. Set it in the backend environment:
       CONTRACT_ID_GIST_REGISTRY=$CONTRACT_ID
     This takes the backend out of mock mode (see Backend/.env.example).
------------------------------------------------------------------
EOF
