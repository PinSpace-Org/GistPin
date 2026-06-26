#!/usr/bin/env bash
# fix-firewall.sh -- Auto-remediate firewall and IP forwarding findings
# Covers CIS-2.1 (firewall active) and CIS-2.2 (IP forwarding disabled)
# NOTE: CIS-2.1 is approval-required in the registry; this script is run
# only after a human approves the change.
set -euo pipefail

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] [fix-firewall] $*"; }

if [[ "$(id -u)" -ne 0 ]]; then
  log "ERROR: must run as root"
  exit 2
fi

# CIS-2.2 -- disable IP forwarding (auto)
log "Disabling IP forwarding..."
sysctl -w net.ipv4.ip_forward=0
sysctl -w net.ipv6.conf.all.forwarding=0
# Persist across reboots
if grep -q "net.ipv4.ip_forward" /etc/sysctl.conf 2>/dev/null; then
  sed -i 's/^net.ipv4.ip_forward.*/net.ipv4.ip_forward=0/' /etc/sysctl.conf
else
  echo "net.ipv4.ip_forward=0" >> /etc/sysctl.conf
fi
log "IP forwarding disabled (CIS-2.2)"

# CIS-2.1 -- ensure firewall is active
log "Configuring firewall..."
if command -v ufw &>/dev/null; then
  ufw --force reset
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow 22/tcp   comment 'SSH'
  ufw allow 80/tcp   comment 'HTTP'
  ufw allow 443/tcp  comment 'HTTPS'
  ufw allow 4500/udp comment 'Submariner NAT-T'
  ufw allow 500/udp  comment 'Submariner IKE'
  ufw --force enable
  log "UFW enabled and rules applied (CIS-2.1)"
elif command -v firewall-cmd &>/dev/null; then
  systemctl enable --now firewalld
  firewall-cmd --permanent --set-default-zone=drop
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
  log "firewalld enabled and rules applied (CIS-2.1)"
else
  log "ERROR: no supported firewall tool found (ufw or firewalld)"
  exit 2
fi

log "Firewall remediation complete"
