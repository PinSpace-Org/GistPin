#!/usr/bin/env bash
# apply-right-sizing.sh — read VPA recommendations and patch deployments safely
# Usage: ./apply-right-sizing.sh [--namespace gistpin] [--dry-run]
set -euo pipefail

NAMESPACE="${NAMESPACE:-gistpin}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --dry-run)   DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== VPA Right-Sizing Report — namespace: ${NAMESPACE} ==="
echo ""

apply_recommendation() {
  local deployment="$1"
  local vpa_name="$2"

  rec=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0]}' 2>/dev/null || true)

  if [[ -z "$rec" ]]; then
    echo "  [SKIP] ${vpa_name}: no recommendation available yet"
    return
  fi

  cpu_target=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.cpu}')
  mem_target=$(kubectl get vpa "${vpa_name}" -n "${NAMESPACE}" \
    -o jsonpath='{.status.recommendation.containerRecommendations[0].target.memory}')

  echo "  [REC] ${deployment}: cpu=${cpu_target} memory=${mem_target}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [DRY-RUN] would patch ${deployment}"
    return
  fi

  kubectl set resources deployment "${deployment}" \
    -n "${NAMESPACE}" \
    --containers="*" \
    --requests="cpu=${cpu_target},memory=${mem_target}" \
    --limits="cpu=${cpu_target},memory=${mem_target}"

  echo "  [DONE] ${deployment} patched"
}

apply_recommendation "backend"   "backend-vpa"
apply_recommendation "frontend"  "frontend-vpa"
apply_recommendation "analytics" "analytics-vpa"

echo ""
echo "=== Cost Savings Summary ==="
kubectl get vpa -n "${NAMESPACE}" \
  -o custom-columns='NAME:.metadata.name,CPU_REC:.status.recommendation.containerRecommendations[0].target.cpu,MEM_REC:.status.recommendation.containerRecommendations[0].target.memory' \
  2>/dev/null || echo "  (no VPA objects found)"
