#!/usr/bin/env bash
# harden-nodes.sh - Apply CIS Level 1 hardening to a Kubernetes worker node.
#
# Idempotent: safe to re-run. Applies kernel/sysctl hardening, tightens kubelet
# file permissions, configures the audit daemon, and installs AIDE for file
# integrity monitoring. Run --scan to verify compliance without changing state.
#
# Usage (run on / delivered to each node, e.g. via a privileged DaemonSet or
# node bootstrap):
#   sudo ./harden-nodes.sh            # apply hardening
#   sudo ./harden-nodes.sh --scan     # compliance scan only (no changes)
set -euo pipefail

MODE="apply"
[[ "${1:-}" == "--scan" ]] && MODE="scan"

SYSCTL_FILE="/etc/sysctl.d/99-cis-hardening.conf"
FAILURES=0

# Desired sysctl values (see cis-node-benchmark.yml).
declare -A SYSCTLS=(
  [net.ipv4.conf.all.rp_filter]=1
  [net.ipv4.conf.all.accept_redirects]=0
  [net.ipv4.conf.all.send_redirects]=0
  [kernel.randomize_va_space]=2
  [fs.protected_hardlinks]=1
  [fs.protected_symlinks]=1
)

log()  { echo "[harden] $*"; }
fail() { echo "[harden][FAIL] $*" >&2; FAILURES=$((FAILURES + 1)); }

apply_sysctls() {
  log "applying kernel/sysctl hardening -> ${SYSCTL_FILE}"
  {
    echo "# Managed by harden-nodes.sh (CIS Level 1). Do not edit by hand."
    for key in "${!SYSCTLS[@]}"; do
      echo "${key} = ${SYSCTLS[$key]}"
    done
  } > "$SYSCTL_FILE"
  sysctl --system >/dev/null
}

scan_sysctls() {
  for key in "${!SYSCTLS[@]}"; do
    local want="${SYSCTLS[$key]}" got
    got="$(sysctl -n "$key" 2>/dev/null || echo "unset")"
    if [[ "$got" == "$want" ]]; then
      log "OK   sysctl ${key}=${got}"
    else
      fail "sysctl ${key}=${got} (want ${want})"
    fi
  done
}

apply_kubelet_perms() {
  log "tightening kubelet file permissions"
  for f in /var/lib/kubelet/config.yaml /etc/kubernetes/kubelet.conf; do
    [[ -e "$f" ]] || continue
    chmod 600 "$f"
    chown root:root "$f"
  done
}

scan_kubelet_perms() {
  for f in /var/lib/kubelet/config.yaml /etc/kubernetes/kubelet.conf; do
    [[ -e "$f" ]] || { log "skip ${f} (not present)"; continue; }
    local mode
    mode="$(stat -c '%a' "$f")"
    if [[ "$mode" == "600" || "$mode" == "400" ]]; then
      log "OK   ${f} mode ${mode}"
    else
      fail "${f} mode ${mode} (want <=600)"
    fi
  done
}

apply_auditd() {
  log "ensuring auditd is installed and enabled"
  if command -v apt-get >/dev/null; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y auditd >/dev/null
  elif command -v yum >/dev/null; then
    yum install -y audit >/dev/null
  fi
  systemctl enable --now auditd >/dev/null 2>&1 || true
}

apply_aide() {
  log "ensuring AIDE file integrity monitoring is installed"
  if command -v apt-get >/dev/null; then
    DEBIAN_FRONTEND=noninteractive apt-get install -y aide >/dev/null
  elif command -v yum >/dev/null; then
    yum install -y aide >/dev/null
  fi
  # Initialize the AIDE database on first run only.
  if [[ ! -f /var/lib/aide/aide.db.gz && ! -f /var/lib/aide/aide.db ]]; then
    log "initializing AIDE database (first run)"
    aideinit -y -f >/dev/null 2>&1 || aide --init >/dev/null 2>&1 || true
  fi
}

scan_services() {
  systemctl is-active --quiet auditd && log "OK   auditd active" || fail "auditd not active"
  command -v aide >/dev/null && log "OK   aide installed" || fail "aide not installed"
}

if [[ "$MODE" == "scan" ]]; then
  log "=== compliance scan (no changes) ==="
  scan_sysctls
  scan_kubelet_perms
  scan_services
  echo ""
  if [[ $FAILURES -eq 0 ]]; then
    log "COMPLIANT: all checks passed"
  else
    fail "${FAILURES} control(s) non-compliant"
    exit 1
  fi
else
  log "=== applying CIS Level 1 hardening ==="
  apply_sysctls
  apply_kubelet_perms
  apply_auditd
  apply_aide
  log "hardening applied; run '--scan' to verify compliance"
fi
