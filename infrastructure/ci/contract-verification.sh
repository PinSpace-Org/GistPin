#!/usr/bin/env bash
set -euo pipefail

NETWORK="${STELLAR_NETWORK:-testnet}"
CONTRACT_ID="${CONTRACT_ID:?CONTRACT_ID is required}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

log "Verifying contract $CONTRACT_ID on $NETWORK..."

# Verify contract exists on network
stellar contract info \
  --id "$CONTRACT_ID" \
  --rpc-url "$STELLAR_RPC_URL" \
  --network-passphrase "$([ "$NETWORK" = "mainnet" ] && echo "Public Global Stellar Network ; September 2015" || echo "Test SDF Network ; September 2015")" \
  2>&1

log "Contract verification successful."
