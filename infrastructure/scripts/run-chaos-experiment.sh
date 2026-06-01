#!/usr/bin/env bash
# Run a chaos engineering experiment
set -euo pipefail

EXPERIMENT="${1:-pod-failure}"
NAMESPACE="${NAMESPACE:-gistpin}"
DURATION="${DURATION:-60}"

echo "==> Starting chaos experiment: $EXPERIMENT (namespace=$NAMESPACE, duration=${DURATION}s)"

case "$EXPERIMENT" in
  pod-failure)
    bash "$(dirname "$0")/chaos-tests/pod-failure.sh" "$NAMESPACE" "$DURATION"
    ;;
  network-latency)
    bash "$(dirname "$0")/chaos-tests/network-latency.sh" "$NAMESPACE" "$DURATION"
    ;;
  resource-exhaustion)
    bash "$(dirname "$0")/chaos-tests/resource-exhaustion.sh" "$NAMESPACE" "$DURATION"
    ;;
  failover)
    bash "$(dirname "$0")/chaos-tests/failover.sh" "$NAMESPACE" "$DURATION"
    ;;
  *)
    echo "Unknown experiment: $EXPERIMENT"
    echo "Available: pod-failure, network-latency, resource-exhaustion, failover"
    exit 1
    ;;
esac

echo "==> Experiment '$EXPERIMENT' complete. Check logs for recovery validation."
