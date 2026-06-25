#!/usr/bin/env bash
# remediate-findings.sh -- Auto-remediate security findings for GistPin
# Usage: ./remediate-findings.sh [findings-json] [--dry-run]
#
# Ingests a compliance findings JSON (output of compliance-checks.sh),
# classifies each finding as AUTO-FIX or REQUIRES-APPROVAL, runs safe
# playbooks automatically, and queues risky changes for human review.
#
# Exit codes: 0=all remediated, 1=some pending approval, 2=critical error

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

FINDINGS_FILE="${1:-infrastructure/ci/reports/compliance-report-latest.json}"
DRY_RUN="${DRY_RUN:-false}"
[[ "${2:-}" == "--dry-run" ]] && DRY_RUN="true"

PLAYBOOK_DIR="${PLAYBOOK_DIR:-infrastructure/security/remediation-playbooks}"
REGISTRY="${PLAYBOOK_DIR}/playbook-registry.yml"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
AUDIT_LOG="${REPORT_DIR}/remediation-audit-$(date -u +%Y%m%d-%H%M%S).json"
APPROVAL_QUEUE="${REPORT_DIR}/pending-approval-$(date -u +%Y%m%d-%H%M%S).json"

mkdir -p "${REPORT_DIR}"

log()     { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
log_dry() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [DRY-RUN] $*"; }

AUDIT_ENTRIES=()
APPROVAL_ENTRIES=()
REMEDIATED=0
PENDING=0
ERRORS=0

# Record an audit entry for every action taken
audit() {
  local finding_id="$1" action="$2" status="$3" detail="${4:-}"
  local entry
  entry="$(jq -n \
    --arg id        "${finding_id}" \
    --arg action    "${action}" \
    --arg status    "${status}" \
    --arg detail    "${detail}" \
    --arg actor     "${USER:-ci}" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg dry_run   "${DRY_RUN}" \
    '{finding_id:$id, action:$action, status:$status, detail:$detail, actor:$actor, timestamp:$timestamp, dry_run:($dry_run=="true")}'
  )"
  AUDIT_ENTRIES+=("${entry}")
}

# Queue a finding for human approval
queue_approval() {
  local finding_id="$1" severity="$2" description="$3" reason="$4" playbook="${5:-none}"
  local entry
  entry="$(jq -n \
    --arg id          "${finding_id}" \
    --arg severity    "${severity}" \
    --arg description "${description}" \
    --arg reason      "${reason}" \
    --arg playbook    "${playbook}" \
    --arg timestamp   "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{finding_id:$id, severity:$severity, description:$description, requires_approval_because:$reason, playbook:$playbook, queued_at:$timestamp, status:"PENDING"}'
  )"
  APPROVAL_ENTRIES+=("${entry}")
  ((PENDING++)) || true
  log "    [QUEUED] ${finding_id} -- requires human approval: ${reason}"
}

# Run a playbook script safely
run_playbook() {
  local finding_id="$1" playbook="$2" description="$3"
  local script="${PLAYBOOK_DIR}/${playbook}"

  if [[ ! -f "${script}" ]]; then
    log "    [ERROR] Playbook not found: ${script}"
    audit "${finding_id}" "run-playbook:${playbook}" "ERROR" "playbook script missing"
    ((ERRORS++)) || true
    return 1
  fi

  if [[ "${DRY_RUN}" == "true" ]]; then
    log_dry "Would run playbook: ${playbook} for ${finding_id}"
    audit "${finding_id}" "run-playbook:${playbook}" "DRY-RUN" "${description}"
    return 0
  fi

  log "    Running playbook: ${playbook}"
  if bash "${script}" >> "${REPORT_DIR}/playbook-output.log" 2>&1; then
    log "    [OK] ${finding_id} remediated via ${playbook}"
    audit "${finding_id}" "run-playbook:${playbook}" "REMEDIATED" "${description}"
    ((REMEDIATED++)) || true
  else
    log "    [FAIL] Playbook ${playbook} failed for ${finding_id}"
    audit "${finding_id}" "run-playbook:${playbook}" "FAILED" "playbook exited non-zero"
    ((ERRORS++)) || true
  fi
}

# Determine risk classification from the registry and act accordingly
remediate_finding() {
  local id="$1" severity="$2" description="$3"

  log "Processing ${id} [${severity}]: ${description}"

  # Look up this finding ID in the playbook registry
  local risk playbook reason
  risk="$(grep -A3 "id: ${id}" "${REGISTRY}" 2>/dev/null | grep "risk:" | awk '{print $2}' || echo "unknown")"
  playbook="$(grep -A3 "id: ${id}" "${REGISTRY}" 2>/dev/null | grep "playbook:" | awk '{print $2}' || echo "")"
  reason="$(grep -A4 "id: ${id}" "${REGISTRY}" 2>/dev/null | grep "approval_reason:" | cut -d: -f2- | xargs || echo "not registered")"

  if [[ -z "${playbook}" ]]; then
    log "    [SKIP] No playbook registered for ${id}"
    audit "${id}" "lookup" "SKIPPED" "no playbook registered"
    return 0
  fi

  case "${risk}" in
    auto)
      run_playbook "${id}" "${playbook}" "${description}"
      ;;
    approval-required)
      queue_approval "${id}" "${severity}" "${description}" "${reason}" "${playbook}"
      ;;
    *)
      log "    [WARN] Unknown risk level '${risk}' for ${id} -- queuing for approval"
      queue_approval "${id}" "${severity}" "${description}" "unknown risk classification" "${playbook}"
      ;;
  esac
}

# Write final audit log
write_audit_log() {
  local entries_json approval_json
  entries_json="$(IFS=,; echo "[${AUDIT_ENTRIES[*]:-}]")"
  approval_json="$(IFS=,; echo "[${APPROVAL_ENTRIES[*]:-}]")"

  jq -n \
    --argjson entries  "${entries_json}" \
    --argjson approval "${approval_json}" \
    --arg timestamp    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson remediated "${REMEDIATED}" \
    --argjson pending    "${PENDING}" \
    --argjson errors     "${ERRORS}" \
    --arg dry_run        "${DRY_RUN}" \
    '{
      timestamp:    $timestamp,
      dry_run:      ($dry_run=="true"),
      summary: {
        remediated: $remediated,
        pending_approval: $pending,
        errors: $errors
      },
      audit_trail:    $entries,
      approval_queue: $approval
    }' > "${AUDIT_LOG}"

  log "Audit log written to ${AUDIT_LOG}"

  if [[ "${PENDING}" -gt 0 ]]; then
    jq -n \
      --argjson items "${approval_json}" \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{generated_at:$timestamp, items:$items}' > "${APPROVAL_QUEUE}"
    log "Approval queue written to ${APPROVAL_QUEUE}"
  fi
}

main() {
  log "==> Starting automated security remediation"
  log "    Findings:  ${FINDINGS_FILE}"
  log "    Playbooks: ${PLAYBOOK_DIR}"
  log "    Dry-run:   ${DRY_RUN}"

  if [[ ! -f "${FINDINGS_FILE}" ]]; then
    log "ERROR: findings file not found: ${FINDINGS_FILE}"
    exit 2
  fi

  if [[ ! -f "${REGISTRY}" ]]; then
    log "ERROR: playbook registry not found: ${REGISTRY}"
    exit 2
  fi

  # Parse failed findings from compliance-checks.sh JSON output
  local findings
  findings="$(jq -r '.results[] | select(.status=="FAIL") | [.id, .severity, .description] | @tsv' "${FINDINGS_FILE}")"

  if [[ -z "${findings}" ]]; then
    log "No failed findings to remediate. Exiting clean."
    write_audit_log
    exit 0
  fi

  while IFS=$'\t' read -r id severity description; do
    remediate_finding "${id}" "${severity}" "${description}"
  done <<< "${findings}"

  write_audit_log

  log "==> Remediation complete."
  log "    Remediated:       ${REMEDIATED}"
  log "    Pending approval: ${PENDING}"
  log "    Errors:           ${ERRORS}"

  if [[ "${ERRORS}" -gt 0 ]]; then
    exit 2
  fi

  if [[ "${PENDING}" -gt 0 ]]; then
    log "ACTION REQUIRED: ${PENDING} finding(s) queued for human approval."
    log "Review: ${APPROVAL_QUEUE}"
    exit 1
  fi

  exit 0
}

main "$@"
