#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

BENCHMARKS_FILE="${BENCHMARKS_FILE:-infrastructure/security/cis-benchmarks.yml}"
REPORT_DIR="${REPORT_DIR:-infrastructure/ci/reports}"
REPORT_FILE="${REPORT_DIR}/compliance-report-$(date -u +%Y%m%d-%H%M%S).json"
FAIL_ON_CRITICAL="${FAIL_ON_CRITICAL:-true}"

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
pass() { echo "PASS"; }
fail() { echo "FAIL"; }

mkdir -p "${REPORT_DIR}"

RESULTS=()
PASS_COUNT=0
FAIL_COUNT=0
CRITICAL_FAIL=0

record() {
  local id="$1" desc="$2" severity="$3" status="$4" detail="${5:-}"
  RESULTS+=("{\"id\":\"${id}\",\"description\":\"${desc}\",\"severity\":\"${severity}\",\"status\":\"${status}\",\"detail\":\"${detail}\"}")
  if [[ "${status}" == "PASS" ]]; then
    (( PASS_COUNT++ )) || true
  else
    (( FAIL_COUNT++ )) || true
    [[ "${severity}" == "CRITICAL" ]] && (( CRITICAL_FAIL++ )) || true
  fi
  log "[${status}] [${severity}] ${id}: ${desc}"
}

# ── CIS 1.x: OS / Container Hardening ────────────────────────────────────────

check_root_login_disabled() {
  if grep -qE '^PermitRootLogin\s+no' /etc/ssh/sshd_config 2>/dev/null; then
    record "CIS-1.1" "SSH root login disabled" "CRITICAL" "PASS"
  else
    record "CIS-1.1" "SSH root login disabled" "CRITICAL" "FAIL" "PermitRootLogin not set to no in sshd_config"
  fi
}

check_password_auth_disabled() {
  if grep -qE '^PasswordAuthentication\s+no' /etc/ssh/sshd_config 2>/dev/null; then
    record "CIS-1.2" "SSH password authentication disabled" "HIGH" "PASS"
  else
    record "CIS-1.2" "SSH password authentication disabled" "HIGH" "FAIL" "PasswordAuthentication not set to no"
  fi
}

check_unattended_upgrades() {
  if dpkg -l unattended-upgrades >/dev/null 2>&1 || rpm -q dnf-automatic >/dev/null 2>&1; then
    record "CIS-1.3" "Automatic security updates enabled" "HIGH" "PASS"
  else
    record "CIS-1.3" "Automatic security updates enabled" "HIGH" "FAIL" "unattended-upgrades / dnf-automatic not installed"
  fi
}

# ── CIS 2.x: Network ─────────────────────────────────────────────────────────

check_firewall_active() {
  if ufw status 2>/dev/null | grep -q "Status: active" || \
     firewall-cmd --state 2>/dev/null | grep -q "running"; then
    record "CIS-2.1" "Host firewall is active" "CRITICAL" "PASS"
  else
    record "CIS-2.1" "Host firewall is active" "CRITICAL" "FAIL" "ufw/firewalld not active"
  fi
}

check_ip_forwarding_disabled() {
  local val
  val="$(sysctl -n net.ipv4.ip_forward 2>/dev/null || echo 1)"
  if [[ "${val}" == "0" ]]; then
    record "CIS-2.2" "IP forwarding disabled" "MEDIUM" "PASS"
  else
    record "CIS-2.2" "IP forwarding disabled" "MEDIUM" "FAIL" "net.ipv4.ip_forward=${val}"
  fi
}

# ── CIS 3.x: Kubernetes ──────────────────────────────────────────────────────

check_k8s_rbac() {
  if kubectl auth can-i --list --as=system:anonymous 2>/dev/null | grep -q "no"; then
    record "CIS-3.1" "Anonymous Kubernetes API access denied" "CRITICAL" "PASS"
  else
    record "CIS-3.1" "Anonymous Kubernetes API access denied" "CRITICAL" "FAIL" "Anonymous access may be permitted"
  fi
}

check_k8s_secrets_encrypted() {
  if kubectl get apiserver -o json 2>/dev/null | grep -q "aescbc\|secretbox"; then
    record "CIS-3.2" "Kubernetes secrets encrypted at rest" "HIGH" "PASS"
  else
    record "CIS-3.2" "Kubernetes secrets encrypted at rest" "HIGH" "FAIL" "Encryption provider not detected"
  fi
}

# ── GDPR ─────────────────────────────────────────────────────────────────────

check_gdpr_data_retention() {
  if grep -rq "retention" infrastructure/terraform/ 2>/dev/null; then
    record "GDPR-1" "Data retention policy configured in Terraform" "HIGH" "PASS"
  else
    record "GDPR-1" "Data retention policy configured in Terraform" "HIGH" "FAIL" "No retention config found in terraform/"
  fi
}

check_gdpr_encryption_in_transit() {
  if grep -rq "ssl_policy\|tls_policy\|https" infrastructure/terraform/ 2>/dev/null; then
    record "GDPR-2" "Encryption in transit configured" "HIGH" "PASS"
  else
    record "GDPR-2" "Encryption in transit configured" "HIGH" "FAIL" "No TLS/SSL policy found in terraform/"
  fi
}

# ── PCI-DSS ───────────────────────────────────────────────────────────────────

check_pci_audit_logging() {
  if grep -rq "cloudwatch\|audit_log\|logging" infrastructure/terraform/ 2>/dev/null; then
    record "PCI-1" "Audit logging enabled" "CRITICAL" "PASS"
  else
    record "PCI-1" "Audit logging enabled" "CRITICAL" "FAIL" "No audit logging config found"
  fi
}

check_pci_mfa() {
  if grep -rq "mfa\|multi_factor" infrastructure/terraform/ 2>/dev/null; then
    record "PCI-2" "MFA enforced for privileged access" "HIGH" "PASS"
  else
    record "PCI-2" "MFA enforced for privileged access" "HIGH" "FAIL" "No MFA config found in terraform/"
  fi
}

# ── Run all checks ────────────────────────────────────────────────────────────

main() {
  log "Starting compliance checks..."

  check_root_login_disabled
  check_password_auth_disabled
  check_unattended_upgrades
  check_firewall_active
  check_ip_forwarding_disabled
  check_k8s_rbac
  check_k8s_secrets_encrypted
  check_gdpr_data_retention
  check_gdpr_encryption_in_transit
  check_pci_audit_logging
  check_pci_mfa

  # Write JSON report
  local results_json
  results_json="$(IFS=,; echo "[${RESULTS[*]}]")"
  jq -n \
    --argjson results "${results_json}" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson pass "${PASS_COUNT}" \
    --argjson fail "${FAIL_COUNT}" \
    --argjson critical "${CRITICAL_FAIL}" \
    '{timestamp:$timestamp, summary:{pass:$pass, fail:$fail, critical_failures:$critical}, results:$results}' \
    > "${REPORT_FILE}"

  log "Report written to ${REPORT_FILE}"
  log "Summary: PASS=${PASS_COUNT} FAIL=${FAIL_COUNT} CRITICAL_FAIL=${CRITICAL_FAIL}"

  if [[ "${FAIL_ON_CRITICAL}" == "true" && "${CRITICAL_FAIL}" -gt 0 ]]; then
    log "ERROR: ${CRITICAL_FAIL} critical compliance check(s) failed."
    exit 2
  fi

  [[ "${FAIL_COUNT}" -gt 0 ]] && exit 1 || exit 0
}

main "$@"
