# Security Hardening

Automated security hardening for GistPin infrastructure.

## What It Does

- **SSH hardening**: disables root login, password auth, X11 forwarding; sets `MaxAuthTries 3`
- **Firewall rules**: configures UFW/iptables to deny all inbound except ports 22, 80, 443
- **Service account audit**: lists non-default K8s service accounts for review
- **Permission audit**: finds and remediates world-writable files in `/etc`
- **Security baseline**: runs pass/fail checks and logs results

## Usage

```bash
# Run with default config
bash infrastructure/scripts/harden-security.sh

# Run with custom config
bash infrastructure/scripts/harden-security.sh infrastructure/security/hardening-config.yml
```

Requires root for SSH and firewall changes. Set `NAMESPACE` env var to target a specific K8s namespace (default: `gistpin`).

## Configuration

Edit `infrastructure/security/hardening-config.yml` to adjust:
- Allowed firewall ports
- SSH settings
- Baseline checks

## Logs

Each run writes a timestamped log to `/tmp/hardening-<timestamp>.log`.
