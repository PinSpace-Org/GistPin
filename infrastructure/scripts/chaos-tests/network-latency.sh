#!/usr/bin/env bash
# Simulate network latency using tc (traffic control) on a target pod
set -euo pipefail

NAMESPACE="${1:-gistpin}"
DURATION="${2:-60}"
LATENCY="${LATENCY:-200ms}"

echo "[network-latency] Injecting ${LATENCY} latency in namespace '$NAMESPACE' for ${DURATION}s..."

POD=$(kubectl get pods -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name" 2>/dev/null | shuf -n1 || echo "")
if [ -z "$POD" ]; then
  echo "[network-latency] No pods found. Skipping."
  exit 0
fi

echo "[network-latency] Target pod: $POD"
kubectl exec "$POD" -n "$NAMESPACE" -- sh -c \
  "tc qdisc add dev eth0 root netem delay ${LATENCY} 2>/dev/null || echo 'tc not available, skipping latency injection'"

echo "[network-latency] Latency active for ${DURATION}s..."
sleep "$DURATION"

kubectl exec "$POD" -n "$NAMESPACE" -- sh -c \
  "tc qdisc del dev eth0 root 2>/dev/null || true"

echo "[network-latency] Latency removed. Experiment complete."
