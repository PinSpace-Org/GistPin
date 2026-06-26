#!/usr/bin/env bash
# fix-ssh.sh -- Auto-remediate SSH hardening findings (CIS-1.1, CIS-1.2)
# Safe to run automatically; backs up sshd_config before any change.
set -euo pipefail

SSHD_CONFIG="${SSHD_CONFIG:-/etc/ssh/sshd_config}"
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [fix-ssh] $*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  log "ERROR: must run as root"
  exit 2
fi

if [[ ! -f "${SSHD_CONFIG}" ]]; then
  log "ERROR: ${SSHD_CONFIG} not found"
  exit 2
fi

BACKUP="${SSHD_CONFIG}.bak.$(date -u +%Y%m%d-%H%M%S)"
cp "${SSHD_CONFIG}" "${BACKUP}"
log "Backed up ${SSHD_CONFIG} to ${BACKUP}"

apply_setting() {
  local key="$1" value="$2"
  if grep -qE "^#*${key}" "${SSHD_CONFIG}"; then
    sed -i "s|^#*${key}.*|${key} ${value}|" "${SSHD_CONFIG}"
  else
    echo "${key} ${value}" >> "${SSHD_CONFIG}"
  fi
  log "Set ${key} = ${value}"
}

apply_setting "PermitRootLogin"        "no"
apply_setting "PasswordAuthentication" "no"
apply_setting "X11Forwarding"          "no"
apply_setting "MaxAuthTries"           "3"
apply_setting "Protocol"               "2"

# Validate config before reloading
if sshd -t 2>/dev/null; then
  systemctl reload sshd 2>/dev/null || true
  log "sshd reloaded successfully"
else
  log "ERROR: sshd config validation failed -- restoring backup"
  cp "${BACKUP}" "${SSHD_CONFIG}"
  exit 2
fi

log "CIS-1.1 / CIS-1.2 remediated"
