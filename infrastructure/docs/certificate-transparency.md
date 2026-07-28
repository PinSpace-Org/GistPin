# Certificate Transparency Monitoring

This document describes the automated Certificate Transparency (CT) log monitoring system for GistPin.

## Overview

The CT monitoring system watches for unauthorized SSL/TLS certificates issued against GistPin domains by querying public CT logs. When a certificate appears that is not on the approved allowlist, an alert is raised.

## Components

| File | Purpose |
|------|---------|
| `scripts/monitor-ct-logs.sh` | Main monitoring script |
| `monitoring/ct-alerts.yml` | Prometheus alert rules for CT events |
| `security/ct-allowlist.txt` | Approved domain list |

## Setup

### 1. Create the domain allowlist

```bash
echo "*.gistpin.org" > infrastructure/security/ct-allowlist.txt
echo "*.staging.gistpin.org" >> infrastructure/security/ct-allowlist.txt
echo "api.gistpin.org" >> infrastructure/security/ct-allowlist.txt
```

One domain or wildcard pattern per line. Lines starting with `#` are ignored.

### 2. Configure environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DOMAIN_ALLOWLIST_FILE` | `security/ct-allowlist.txt` | Path to domain allowlist |
| `SLACK_WEBHOOK` | _(none)_ | Slack incoming webhook URL |
| `CT_API_BASE` | `https://crt.sh` | CT log API endpoint |
| `CHECK_INTERVAL` | `3600` | Seconds between monitoring cycles |
| `LOOKBACK_HOURS` | `24` | Hours of CT log to scan per check |
| `REPORT_DIR` | `/tmp/ct-reports` | Directory for weekly reports |

### 3. Run the monitor

```bash
# One-shot check
./scripts/monitor-ct-logs.sh

# Generate weekly report
./scripts/monitor-ct-logs.sh --report
```

### 4. Schedule with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ct-monitor
  namespace: gistpin-monitoring
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: ct-monitor
            image: gistpin/ct-monitor:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: ct-alerts
                  key: slack-webhook
          restartPolicy: OnFailure
```

## How It Works

1. The script reads domains from the allowlist
2. For each domain, it queries `crt.sh` for certificates issued in the last N hours
3. Certificates from known trusted CAs (Let's Encrypt, Google Trust, DigiCert, Cloudflare) are ignored
4. Remaining certificates are checked against the allowlist
5. Any unexpected certificate triggers a Slack alert

## Alert Rules

| Alert | Severity | Condition |
|-------|----------|-----------|
| `UnexpectedCertificateDetected` | critical | Certificate found outside allowlist |
| `CTLogCheckFailing` | warning | Script failing for > 30 minutes |
| `CTReportOverdue` | info | Weekly report not generated in 7 days |
| `CTLogHighCertificateCount` | warning | > 50 certs in 24h for a domain |

## Incident Response

When an unexpected certificate is detected:

1. **Verify** — Check the alert details for the domain and issuer
2. **Check crt.sh** — Manually browse https://crt.sh/?q=DOMAIN for details
3. **Contact issuer** — If unauthorized, contact the certificate authority to revoke
4. **Rotate keys** — If compromise is suspected, rotate all secrets and keys
5. **Update allowlist** — If the certificate is legitimate, add the domain to the allowlist
6. **Document** — Record the incident in the runbook under `docs/incident-response.md`

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All domains clean |
| 1 | Warning — unexpected certificates detected |
| 2 | Critical — script error or alert sent |
