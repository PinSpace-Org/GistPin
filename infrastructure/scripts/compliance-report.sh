#!/usr/bin/env bash
# Automated compliance reporting — SOC2 evidence, GDPR checks, audit trail
set -euo pipefail

REPORT_DIR="${REPORT_DIR:-infrastructure/reports/compliance}"
EVIDENCE_DIR="${EVIDENCE_DIR:-infrastructure/reports/compliance/evidence}"
mkdir -p "${REPORT_DIR}" "${EVIDENCE_DIR}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
REPORT_FILE="${REPORT_DIR}/compliance-report-${TIMESTAMP}.json"

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

# ── SOC2 evidence collection ──────────────────────────────────────────────────
collect_soc2_evidence() {
  log "Collecting SOC2 evidence..."
  local evidence_file="${EVIDENCE_DIR}/soc2-${TIMESTAMP}.json"

  # Collect k8s RBAC state as access-control evidence
  local rbac_summary="{}"
  if command -v kubectl &>/dev/null; then
    rbac_summary="$(kubectl get rolebindings,clusterrolebindings \
      --all-namespaces -o json 2>/dev/null \
      | jq '{rbac_bindings: [.items[] | {name:.metadata.name, namespace:.metadata.namespace, kind:.kind}]}' \
      || echo '{}')"
  fi

  jq -n \
    --arg ts "${TIMESTAMP}" \
    --argjson rbac "${rbac_summary}" \
    '{collected_at:$ts, category:"SOC2", rbac:$rbac}' > "${evidence_file}"
  log "SOC2 evidence: ${evidence_file}"
}

# ── GDPR compliance checks ────────────────────────────────────────────────────
gdpr_checks() {
  log "Running GDPR compliance checks..."
  local checks_dir="infrastructure/security/compliance-checks"
  local passed=0 failed=0

  # Run each check script if present
  if [[ -d "${checks_dir}" ]]; then
    for check in "${checks_dir}"/*.sh; do
      [[ -f "${check}" ]] || continue
      if bash "${check}" 2>/dev/null; then
        log "  PASS: ${check}"
        ((passed++)) || true
      else
        log "  FAIL: ${check}"
        ((failed++)) || true
      fi
    done
  fi

  log "GDPR checks — passed: ${passed}, failed: ${failed}"
  echo "${failed}"
}

# ── Audit trail generation ────────────────────────────────────────────────────
generate_audit_trail() {
  log "Generating audit trail..."
  local audit_file="${EVIDENCE_DIR}/audit-trail-${TIMESTAMP}.log"

  # Recent git commits as change-management evidence
  git log --oneline --since="30 days ago" --format="%H %ae %ai %s" \
    2>/dev/null > "${audit_file}" || true

  log "Audit trail: ${audit_file}"
}

# ── Final report ──────────────────────────────────────────────────────────────
write_report() {
  local gdpr_failures="$1"
  local status="compliant"
  [[ "${gdpr_failures}" -gt 0 ]] && status="non-compliant"

  jq -n \
    --arg ts "${TIMESTAMP}" \
    --arg env "${ENVIRONMENT:-unknown}" \
    --arg status "${status}" \
    --argjson gdpr_failures "${gdpr_failures}" \
    '{
      generated_at: $ts,
      environment: $env,
      overall_status: $status,
      gdpr_failures: $gdpr_failures,
      evidence_dir: "infrastructure/reports/compliance/evidence"
    }' > "${REPORT_FILE}"

  log "Compliance report: ${REPORT_FILE}"
  [[ "${status}" == "compliant" ]] || { log "WARNING: compliance failures detected"; exit 1; }
}

collect_soc2_evidence
gdpr_failures="$(gdpr_checks)"
generate_audit_trail
write_report "${gdpr_failures}"

log "Compliance reporting complete."
