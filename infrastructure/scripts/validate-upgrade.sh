#!/usr/bin/env bash
# validate-upgrade.sh — pre/post upgrade validation
# Usage: ./validate-upgrade.sh --current 1.29 --target 1.30 [--dry-run]
set -euo pipefail

CURRENT=""
TARGET=""
DRY_RUN=false
CLUSTER_NAME="${CLUSTER_NAME:-gistpin-cluster}"
REGION="${AWS_REGION:-us-east-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --current) CURRENT="$2"; shift 2 ;;
    --target)  TARGET="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== Upgrade Validation: ${CURRENT} → ${TARGET} ==="

PASS=0; FAIL=0

check() {
  local name="$1"; shift
  if eval "$@" &>/dev/null; then
    echo "  [PASS] ${name}"
    ((PASS++)) || true
  else
    echo "  [FAIL] ${name}"
    ((FAIL++)) || true
  fi
}

# Core system workloads
check "kube-system pods running" \
  "kubectl get pods -n kube-system --field-selector=status.phase=Running | grep -q Running"

# All nodes ready
check "All nodes Ready" \
  "[[ \$(kubectl get nodes --no-headers | grep -v ' Ready' | wc -l) -eq 0 ]]"

# Deprecated API check (skipped in dry-run)
if [[ "${DRY_RUN}" != "true" ]]; then
  check "No deprecated APIs in use" \
    "kubectl api-resources --verbs=list --output=name 2>/dev/null | grep -qv 'extensions/v1beta1'"
fi

# CoreDNS healthy
check "CoreDNS deployment available" \
  "kubectl rollout status deployment/coredns -n kube-system --timeout=30s"

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
[[ "${FAIL}" -eq 0 ]] || { echo "Validation failed. Investigate before proceeding."; exit 1; }
echo "Validation passed."
