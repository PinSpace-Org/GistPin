#!/usr/bin/env bash
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
WASM_FILE="contracts/target/wasm32-unknown-unknown/release/gistpin_contracts.wasm"
CONTRACT_IDS_FILE="contract-ids.json"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

if [ ! -f "$WASM_FILE" ]; then
  echo "WASM file not found: $WASM_FILE"
  exit 1
fi

log "Deploying contract to $NETWORK..."

# Deploy using Stellar CLI
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_FILE" \
  --source-account "$STELLAR_SECRET_KEY" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$([ "$NETWORK" = "mainnet" ] && echo "Public Global Stellar Network ; September 2015" || echo "Test SDF Network ; September 2015")" \
  2>&1 | tail -1)

log "Contract deployed with ID: $CONTRACT_ID"

# Output for subsequent steps
echo "contract_id=$CONTRACT_ID" >> "${GITHUB_OUTPUT:-/dev/null}"

# Save contract IDs
cat > "$CONTRACT_IDS_FILE" <<EOF
{
  "network": "$NETWORK",
  "contractId": "$CONTRACT_ID",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "commit": "${GITHUB_SHA:-local}"
}
EOF

log "Contract IDs saved to $CONTRACT_IDS_FILE"
