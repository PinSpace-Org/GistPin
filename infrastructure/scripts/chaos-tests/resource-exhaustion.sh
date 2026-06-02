#!/usr/bin/env bash
# Simulate resource exhaustion (CPU/memory stress) on a target pod
set -euo pipefail

NAMESPACE="${1:-gistpin}"
DURATION="${2:-60}"

echo "[resource-exhaustion] Running stress test in namespace '$NAMESPACE' for ${DURATION}s..."

POD=$(kubectl get pods -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name" 2>/dev/null | shuf -n1 || echo "")
if [ -z "$POD" ]; then
  echo "[resource-exhaustion] No pods found. Skipping."
  exit 0
fi

echo "[resource-exhaustion] Target pod: $POD"
kubectl exec "$POD" -n "$NAMESPACE" -- sh -c \
  "if command -v stress &>/dev/null; then
     stress --cpu 2 --timeout ${DURATION}s &
   else
     echo 'stress not available; simulating with yes loop'
     timeout ${DURATION}s sh -c 'yes > /dev/null &' || true
   fi" 2>/dev/null || echo "[resource-exhaustion] Could not exec into pod"

sleep "$DURATION"
echo "[resource-exhaustion] Resource exhaustion test complete."
