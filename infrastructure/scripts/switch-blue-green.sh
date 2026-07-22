#!/usr/bin/env bash
# Switch blue-green traffic for GistPin backend
# Usage: switch-blue-green.sh <blue|green> [service-name] [namespace]
set -euo pipefail

TARGET="${1:-}"
SERVICE="${2:-gistpin-backend}"
NAMESPACE="${3:-gistpin}"
VERIFY="${VERIFY:-true}"
VERIFY_TIMEOUT="${VERIFY_TIMEOUT:-30}"
ROLLBACK_ON_FAIL="${ROLLBACK_ON_FAIL:-false}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()    { echo "[$(date -u +%H:%M:%S)] $*"; }
info()   { log "${GREEN}INFO${NC}  $*"; }
warn()   { log "${YELLOW}WARN${NC}  $*"; }
error()  { log "${RED}ERROR${NC} $*" >&2; }

if [[ "$TARGET" != "blue" && "$TARGET" != "green" ]]; then
  echo "Usage: $0 <blue|green> [service-name] [namespace]"
  exit 1
fi

get_current_slot() {
  kubectl get service "$SERVICE" -n "$NAMESPACE" \
    -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo ""
}

verify_switch() {
  local expected="$1"
  local elapsed=0

  info "Verifying traffic switch (timeout: ${VERIFY_TIMEOUT}s)..."

  while [[ ${elapsed} -lt ${VERIFY_TIMEOUT} ]]; do
    local current
    current="$(get_current_slot)"
    if [[ "${current}" == "${expected}" ]]; then
      info "Traffic switch verified: active=${current}"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done

  error "Traffic switch verification failed: expected=${expected}, current=$(get_current_slot)"
  return 1
}

perform_switch() {
  local current_slot
  current_slot="$(get_current_slot)"

  if [[ "${current_slot}" == "${TARGET}" ]]; then
    info "Traffic already pointing to ${TARGET}"
    return 0
  fi

  info "Switching ${SERVICE} in namespace ${NAMESPACE} from ${current_slot:-none} to ${TARGET}"

  kubectl patch service "$SERVICE" -n "$NAMESPACE" \
    -p "{\"spec\":{\"selector\":{\"version\":\"${TARGET}\"}}}"

  info "Traffic switch initiated"
}

main() {
  info "=== Blue-Green Traffic Switch ==="
  info "Service: ${SERVICE}"
  info "Namespace: ${NAMESPACE}"
  info "Target: ${TARGET}"

  if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
    error "Namespace ${NAMESPACE} does not exist"
    exit 1
  fi

  if ! kubectl get service "$SERVICE" -n "$NAMESPACE" &>/dev/null; then
    error "Service ${SERVICE} does not exist in namespace ${NAMESPACE}"
    exit 1
  fi

  perform_switch

  if [[ "${VERIFY}" == "true" ]]; then
    if ! verify_switch "${TARGET}"; then
      if [[ "${ROLLBACK_ON_FAIL}" == "true" && -n "${current_slot:-}" ]]; then
        warn "Rolling back to ${current_slot}..."
        kubectl patch service "$SERVICE" -n "$NAMESPACE" \
          -p "{\"spec\":{\"selector\":{\"version\":\"${current_slot}\"}}}"
        error "Traffic switch failed and rolled back"
      fi
      exit 1
    fi
  fi

  info "=== Traffic Switch Complete ==="
  info "Active slot: ${TARGET}"
}

main
