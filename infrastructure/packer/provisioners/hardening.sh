#!/bin/bash
set -euo pipefail
# CIS benchmark hardening
# Disable root SSH login
sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
# Enable auditd
apt-get install -y auditd
systemctl enable auditd
# Set secure umask
echo 'umask 027' >> /etc/profile
