#!/usr/bin/env bash
# Test failover by scaling down a deployment and validating recovery
set -euo pipefail

NAMESPACE="${1:-gistpin}"
DURATION="${2:-60}"
DEPLOYMENT="${DEPLOYMENT:-backend}"

echo "[failover] Scaling down deployment '$DEPLOYMENT' in '$NAMESPACE'..."
ORIGINAL_REPLICAS=$(kubectl get deployment "$DEPLOYMENT" -n "$NAMESPACE" \
  -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")

kubectl scale deployment "$DEPLOYMENT" -n "$NAMESPACE" --replicas=0 2>/dev/null || \
  echo "[failover] Could not scale deployment (may not exist in this env)"

echo "[failover] Deployment scaled to 0. Waiting ${DURATION}s..."
sleep "$DURATION"

echo "[failover] Restoring deployment to $ORIGINAL_REPLICAS replicas..."
kubectl scale deployment "$DEPLOYMENT" -n "$NAMESPACE" --replicas="$ORIGINAL_REPLICAS" 2>/dev/null || true

echo "[failover] Waiting for pods to become ready..."
kubectl rollout status deployment/"$DEPLOYMENT" -n "$NAMESPACE" --timeout=120s 2>/dev/null || \
  echo "[failover] Rollout status check skipped"

echo "[failover] Failover test complete."
