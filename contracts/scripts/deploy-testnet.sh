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
# `stellar contract build --optimize` replaces BOTH `cargo build --release` and
# the deprecated `stellar contract optimize`: it compiles for the wasm32 target
# with the release profile (landing at the same $WASM path above) and, as the
# deprecation notice says, runs the optimiser for you.
#
# The optimiser writes gistpin_contracts.optimized.wasm and then renames it back
# over gistpin_contracts.wasm, so the optimised artefact to deploy is $WASM
# itself — there is no separate .optimized.wasm for the script to read.
stellar contract build --optimize
OPTIMIZED="$WASM"

echo "==> Deploying to $NETWORK"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMIZED" \
  --source "$IDENTITY" \
  --network "$NETWORK")

echo "==> Deployed: $CONTRACT_ID"

ADMIN="${2:-$(stellar keys address "$IDENTITY")}"

# `initialize` can fail transiently right after a deploy (the freshly created
# contract may not be queryable yet), so retry it a bounded number of times
# before declaring failure.
INIT_ATTEMPTS=3
INIT_RETRY_DELAY=10

echo "==> Initializing moderator: $ADMIN"
INITIALIZED=0
for ((attempt = 1; attempt <= INIT_ATTEMPTS; attempt++)); do
  if ((attempt > 1)); then
    echo "==> initialize attempt ${attempt}/${INIT_ATTEMPTS} — previous attempt failed, retrying in ${INIT_RETRY_DELAY}s"
    sleep "$INIT_RETRY_DELAY"
  else
    echo "==> initialize attempt ${attempt}/${INIT_ATTEMPTS}"
  fi

  if stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    -- initialize --admin "$ADMIN"; then
    INITIALIZED=1
    break
  fi

  echo "==> initialize attempt ${attempt}/${INIT_ATTEMPTS} failed" >&2
done

if ((INITIALIZED == 0)); then
  echo "error: initialize failed after ${INIT_ATTEMPTS} attempts." >&2
  echo "  contract id : $CONTRACT_ID" >&2
  echo "  moderator   : $ADMIN" >&2
  exit 1
fi

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
