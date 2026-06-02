#!/usr/bin/env bash
# Inject pod failure by deleting a random pod and validating recovery
set -euo pipefail

NAMESPACE="${1:-gistpin}"
DURATION="${2:-60}"

echo "[pod-failure] Selecting a random pod in namespace '$NAMESPACE'..."
POD=$(kubectl get pods -n "$NAMESPACE" --no-headers -o custom-columns=":metadata.name" 2>/dev/null | shuf -n1 || echo "")

if [ -z "$POD" ]; then
  echo "[pod-failure] No pods found in namespace '$NAMESPACE'. Skipping."
  exit 0
fi

echo "[pod-failure] Deleting pod: $POD"
kubectl delete pod "$POD" -n "$NAMESPACE" --grace-period=0 --force 2>/dev/null || true

echo "[pod-failure] Waiting ${DURATION}s for recovery..."
sleep "$DURATION"

echo "[pod-failure] Checking pod recovery..."
RUNNING=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
echo "[pod-failure] Running pods after recovery: $RUNNING"
[ "$RUNNING" -gt 0 ] && echo "[pod-failure] PASS: pods recovered" || echo "[pod-failure] WARN: no running pods detected"
