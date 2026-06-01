#!/usr/bin/env bash
# Automated security hardening for GistPin infrastructure
set -euo pipefail

CONFIG="${1:-infrastructure/security/hardening-config.yml}"
LOG_FILE="/tmp/hardening-$(date +%Y%m%d-%H%M%S).log"

log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }

log "==> Starting security hardening (config: $CONFIG)"

# --- SSH Hardening ---
log "==> SSH hardening..."
SSHD_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSHD_CONFIG" ] && [ "$(id -u)" -eq 0 ]; then
  cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.$(date +%Y%m%d)"
  sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
  sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
  sed -i 's/^#*X11Forwarding.*/X11Forwarding no/' "$SSHD_CONFIG"
  sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"
  grep -q "^Protocol" "$SSHD_CONFIG" || echo "Protocol 2" >> "$SSHD_CONFIG"
  systemctl reload sshd 2>/dev/null || true
  log "    SSH hardened."
else
  log "    [SKIP] Not root or sshd_config not found."
fi

# --- Firewall Rules ---
log "==> Firewall rules..."
if command -v ufw &>/dev/null && [ "$(id -u)" -eq 0 ]; then
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp comment 'SSH'
  ufw allow 80/tcp comment 'HTTP'
  ufw allow 443/tcp comment 'HTTPS'
  ufw --force enable
  log "    UFW rules applied."
elif command -v iptables &>/dev/null && [ "$(id -u)" -eq 0 ]; then
  iptables -P INPUT DROP
  iptables -P FORWARD DROP
  iptables -P OUTPUT ACCEPT
  iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
  iptables -A INPUT -p tcp --dport 22 -j ACCEPT
  iptables -A INPUT -p tcp --dport 80 -j ACCEPT
  iptables -A INPUT -p tcp --dport 443 -j ACCEPT
  iptables -A INPUT -i lo -j ACCEPT
  log "    iptables rules applied."
else
  log "    [SKIP] No firewall tool available or not root."
fi

# --- Service Account Cleanup ---
log "==> Service account audit..."
if command -v kubectl &>/dev/null; then
  NAMESPACE="${NAMESPACE:-gistpin}"
  kubectl get serviceaccounts -n "$NAMESPACE" --no-headers 2>/dev/null | \
    awk '{print $1}' | grep -v "^default$" | while read -r sa; do
      log "    Found SA: $sa"
    done
else
  log "    [SKIP] kubectl not available."
fi

# --- Permission Audit ---
log "==> Permission audit..."
find /etc -maxdepth 1 -name "*.conf" -perm /o+w 2>/dev/null | while read -r f; do
  log "    WARN: world-writable config: $f"
  chmod o-w "$f" 2>/dev/null || true
done

# --- Security Baseline Check ---
log "==> Security baseline..."
PASS=0; FAIL=0
check() {
  local desc="$1"; shift
  if eval "$@" &>/dev/null; then
    log "    PASS: $desc"; ((PASS++))
  else
    log "    FAIL: $desc"; ((FAIL++))
  fi
}
check "SSH root login disabled"   "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config 2>/dev/null"
check "Password auth disabled"    "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config 2>/dev/null"
check "No world-writable /etc"    "! find /etc -maxdepth 1 -perm /o+w 2>/dev/null | grep -q ."

log "==> Baseline: $PASS passed, $FAIL failed."
log "==> Hardening complete. Log: $LOG_FILE"
