#!/usr/bin/env bash
# runbook-executor.sh — execute runbook steps with optional human approval gates
# Usage: ./runbook-executor.sh --runbook runbooks/as-code/restart-backend.yaml [--dry-run]
set -euo pipefail

RUNBOOK_FILE=""
DRY_RUN=false
AUDIT_LOG="/tmp/runbook-audit-$(date +%Y%m%d-%H%M%S).log"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runbook)  RUNBOOK_FILE="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

[[ -z "${RUNBOOK_FILE}" ]] && { echo "ERROR: --runbook required"; exit 1; }
[[ -f "${RUNBOOK_FILE}" ]] || { echo "ERROR: runbook not found: ${RUNBOOK_FILE}"; exit 1; }

log() { echo "[$(date -u +%T)] $*" | tee -a "${AUDIT_LOG}"; }

log "=== Runbook Executor ==="
log "Runbook: ${RUNBOOK_FILE}"
log "Dry-run: ${DRY_RUN}"
log "Audit log: ${AUDIT_LOG}"
echo ""

# Parse runbook YAML (requires yq or python3)
if command -v yq &>/dev/null; then
  TITLE=$(yq '.title' "${RUNBOOK_FILE}" 2>/dev/null || echo "unknown")
  STEP_COUNT=$(yq '.steps | length' "${RUNBOOK_FILE}" 2>/dev/null || echo "0")
else
  TITLE=$(python3 -c "import yaml,sys; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(d.get('title','unknown'))" 2>/dev/null || echo "unknown")
  STEP_COUNT=$(python3 -c "import yaml,sys; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(len(d.get('steps',[])))" 2>/dev/null || echo "0")
fi

log "Title: ${TITLE} | Steps: ${STEP_COUNT}"
echo ""

for i in $(seq 0 $((STEP_COUNT - 1))); do
  if command -v yq &>/dev/null; then
    NAME=$(yq ".steps[${i}].name" "${RUNBOOK_FILE}")
    CMD=$(yq ".steps[${i}].command" "${RUNBOOK_FILE}")
    REQUIRES_APPROVAL=$(yq ".steps[${i}].requires_approval // \"false\"" "${RUNBOOK_FILE}")
    ROLLBACK_CMD=$(yq ".steps[${i}].rollback // \"\"" "${RUNBOOK_FILE}")
  else
    NAME=$(python3 -c "import yaml; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(d['steps'][${i}].get('name','step-${i}'))")
    CMD=$(python3 -c "import yaml; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(d['steps'][${i}].get('command','echo no-op'))")
    REQUIRES_APPROVAL=$(python3 -c "import yaml; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(str(d['steps'][${i}].get('requires_approval',False)).lower())")
    ROLLBACK_CMD=$(python3 -c "import yaml; d=yaml.safe_load(open('${RUNBOOK_FILE}')); print(d['steps'][${i}].get('rollback',''))" 2>/dev/null || echo "")
  fi

  log "Step $((i+1))/${STEP_COUNT}: ${NAME}"

  # Human approval gate
  if [[ "${REQUIRES_APPROVAL}" == "true" && "${DRY_RUN}" != "true" ]]; then
    read -rp "  Approve step '${NAME}'? [yes/no/rollback]: " answer
    case "${answer}" in
      yes) log "  Approved." ;;
      rollback)
        log "  Rolling back previous steps..."
        [[ -n "${ROLLBACK_CMD}" ]] && eval "${ROLLBACK_CMD}" && log "  Rollback complete."
        exit 1
        ;;
      *) log "  Skipped by user."; continue ;;
    esac
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log "  [DRY-RUN] Would run: ${CMD}"
  else
    log "  Running: ${CMD}"
    if ! eval "${CMD}"; then
      log "  FAILED. Attempting rollback..."
      [[ -n "${ROLLBACK_CMD}" ]] && eval "${ROLLBACK_CMD}" && log "  Rollback complete."
      exit 1
    fi
    log "  OK."
  fi
done

log ""
log "=== Runbook completed successfully ==="
