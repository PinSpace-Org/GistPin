#!/usr/bin/env python3
"""GistPin Soroban / Stellar transaction metrics exporter."""

import argparse
import os
import sys
import time

try:
    import requests
except ImportError:
    print("requests required: pip install requests", file=sys.stderr)
    sys.exit(1)

from prometheus_client import start_http_server, Gauge, Counter, Histogram

# --- Prometheus metrics ---
SOROBAN_TX_TOTAL = Counter(
    "gistpin_soroban_transactions_total",
    "Total Soroban smart-contract transactions",
    ["contract", "status"],
)
SOROBAN_TX_FEE = Histogram(
    "gistpin_soroban_transaction_fee_stroops",
    "Soroban transaction fee distribution",
    buckets=[100, 1000, 5000, 10000, 50000, 100000],
)
SOROBAN_TX_DURATION = Histogram(
    "gistpin_soroban_transaction_duration_seconds",
    "Soroban transaction confirmation latency",
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30],
)
SOROBAN_CONTRACT_CALLS = Counter(
    "gistpin_soroban_contract_calls_total",
    "Total Soroban contract function invocations",
    ["contract", "function"],
)
SOROBAN_CONTRACT_STATE = Gauge(
    "gistpin_soroban_contract_state_bytes",
    "Soroban contract ledger entry size in bytes",
    ["contract"],
)
SOROBAN_ACTIVE_ACCOUNTS = Gauge(
    "gistpin_soroban_active_accounts",
    "Active accounts interacting with GistPin contracts",
)
SOROBAN_LEDGER_SEQUENCE = Gauge(
    "gistpin_soroban_ledger_sequence",
    "Current Stellar ledger sequence number",
)
IPFS_PIN_COUNT = Gauge(
    "gistpin_ipfs_total_pins",
    "Total IPFS pins managed by GistPin",
)
IPFS_PIN_SIZE = Gauge(
    "gistpin_ipfs_total_pinned_bytes",
    "Total bytes pinned on IPFS",
)
IPFS_BANDWIDTH = Counter(
    "gistpin_ipfs_bandwidth_bytes_total",
    "Total IPFS bandwidth usage",
    ["direction"],
)

RPC_URL = os.environ.get("STELLAR_RPC_URL", "https://soroban-testnet.stellar.org")
HORIZON_URL = os.environ.get("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org")

# Contract IDs (32-byte hex) — replace with deployed contract addresses
CONTRACT_IDS = {
    "gistpin-registry": os.environ.get("GISTPIN_REGISTRY_CONTRACT", ""),
    "gistpin-store": os.environ.get("GISTPIN_STORE_CONTRACT", ""),
    "gistpin-rewards": os.environ.get("GISTPIN_REWARDS_CONTRACT", ""),
}


def fetch_horizon_metrics():
    """Fetch Stellar network metrics from Horizon."""
    try:
        # Ledger sequence
        resp = requests.get(
            f"{HORIZON_URL}/ledgers",
            params={"order": "desc", "limit": 1},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        if data["_embedded"]["records"]:
            seq = data["_embedded"]["records"][0]["sequence"]
            SOROBAN_LEDGER_SEQUENCE.set(seq)

    except Exception as e:
        print(f"Horizon metrics fetch failed: {e}", file=sys.stderr)


def fetch_contract_metrics():
    """Fetch GistPin Soroban contract metrics from RPC."""
    for name, contract_id in CONTRACT_IDS.items():
        if not contract_id:
            continue

        try:
            resp = requests.post(
                RPC_URL,
                json={
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getLedgerEntries",
                    "params": {
                        "keys": [contract_id],
                    },
                },
                timeout=10,
            )
            if resp.status_code == 200:
                entry_bytes = len(resp.content)
                SOROBAN_CONTRACT_STATE.labels(contract=name).set(entry_bytes)
                SOROBAN_ACTIVE_ACCOUNTS.set(1)
        except Exception:
            pass


def fetch_ipfs_metrics():
    """Fetch IPFS pin metrics from IPFS API."""
    try:
        ipfs_api = os.environ.get("IPFS_API_URL", "http://localhost:5001/api/v0")

        # Total pins
        resp = requests.post(
            f"{ipfs_api}/pin/ls",
            params={"type": "recursive", "quiet": "true"},
            timeout=30,
        )
        if resp.status_code == 200:
            pins = resp.json().get("Keys", {})
            IPFS_PIN_COUNT.set(len(pins))
            total_bytes = sum(int(pins[k].get("Size", 0)) for k in pins)
            IPFS_PIN_SIZE.set(total_bytes)

        # Bandwidth stats
        resp = requests.post(f"{ipfs_api}/stats/bw", timeout=10)
        if resp.status_code == 200:
            bw = resp.json()
            IPFS_BANDWIDTH.labels(direction="in").inc(bw.get("TotalIn", 0))
            IPFS_BANDWIDTH.labels(direction="out").inc(bw.get("TotalOut", 0))

    except Exception as e:
        print(f"IPFS metrics fetch failed: {e}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="GistPin Soroban & IPFS Metrics Exporter")
    parser.add_argument("--port", type=int, default=9102, help="Metrics HTTP port")
    parser.add_argument("--interval", type=int, default=30, help="Collection interval in seconds")
    args = parser.parse_args()

    if not any(CONTRACT_IDS.values()):
        print(
            "No contract IDs configured — set GISTPIN_REGISTRY_CONTRACT, "
            "GISTPIN_STORE_CONTRACT, GISTPIN_REWARDS_CONTRACT env vars. "
            "Running with IPFS-only metrics.",
            file=sys.stderr,
        )

    start_http_server(args.port)
    print(f"Soroban exporter listening on :{args.port}/metrics", file=sys.stderr)

    while True:
        fetch_horizon_metrics()
        fetch_contract_metrics()
        fetch_ipfs_metrics()
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
