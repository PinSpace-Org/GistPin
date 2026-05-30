#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
SERVICE="${2:-gistpin-service}"
NAMESPACE="${3:-default}"

if [[ "$TARGET" != "blue" && "$TARGET" != "green" ]]; then
  echo "Usage: $0 <blue|green> [service-name] [namespace]"
  exit 1
fi

echo "Switching $SERVICE in namespace $NAMESPACE to version: $TARGET"
kubectl patch service "$SERVICE" -n "$NAMESPACE" \
  -p "{\"spec\":{\"selector\":{\"app\":\"gistpin\",\"version\":\"$TARGET\"}}}"
echo "Done. Active slot: $TARGET"
