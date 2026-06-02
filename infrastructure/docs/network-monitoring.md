# Network Traffic Analysis

Automated network traffic monitoring for GistPin using AWS VPC Flow Logs.

## Files

| File | Purpose |
|---|---|
| `infrastructure/scripts/analyze-traffic.sh` | Fetches flow logs, detects anomalies, checks rules, writes report |
| `infrastructure/security/traffic-rules.yml` | Port-level traffic rules and anomaly thresholds |

## Usage

```bash
# Analyse last 60 minutes of traffic
bash infrastructure/scripts/analyze-traffic.sh

# Custom lookback window and Slack alerts
LOOKBACK_MINUTES=30 SLACK_WEBHOOK="https://hooks.slack.com/..." \
  bash infrastructure/scripts/analyze-traffic.sh

# Different AWS region / log group
AWS_REGION=eu-west-1 FLOW_LOG_GROUP=/aws/vpc/gistpin-eu \
  bash infrastructure/scripts/analyze-traffic.sh
```

**Exit codes:** `0` = clean, `1` = anomalies or rule violations detected

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `FLOW_LOG_GROUP` | `/aws/vpc/gistpin-flow-logs` | CloudWatch log group for VPC flow logs |
| `LOOKBACK_MINUTES` | `60` | Minutes of history to analyse |
| `RULES_FILE` | `infrastructure/security/traffic-rules.yml` | Traffic rules definition |
| `REPORT_DIR` | `infrastructure/ci/reports` | Output directory for JSON reports |
| `SLACK_WEBHOOK` | _(empty)_ | Slack webhook for alerts |
| `AWS_REGION` | `us-east-1` | AWS region |

## Anomaly Detection

The script detects three categories of anomalies (thresholds configurable in `traffic-rules.yml`):

| Anomaly | Default Threshold | Description |
|---|---|---|
| DDoS | >10,000 packets/window from one source | Volumetric flood from a single IP |
| Port scan | >50 distinct destination ports from one source | Reconnaissance activity |
| Reject spike | >500 REJECT actions in window | Broad access attempt or misconfiguration |

## Traffic Rules

Rules in `traffic-rules.yml` define expected `ACCEPT`/`REJECT` behaviour per port. Any flow log entry that violates a rule triggers an alert. Key rules:

- Port 443 — must be ACCEPT (public HTTPS)
- Port 3000 — must be REJECT (backend API, internal only)
- Port 5432 — must be REJECT (PostgreSQL, private subnet only)
- Port 22 — must be REJECT (SSH blocked; use SSM)

## Report Format

```json
{
  "timestamp": "2026-06-01T09:00:00Z",
  "summary": {
    "total_flows": 12400,
    "total_bytes": 98765432,
    "accepted": 12100,
    "rejected": 300,
    "top_sources": [...],
    "top_dest_ports": [...]
  },
  "anomalies": [],
  "rule_violations": []
}
```

## AWS Prerequisites

1. Enable VPC Flow Logs on the GistPin VPC, publishing to CloudWatch Logs group `/aws/vpc/gistpin-flow-logs`.
2. Ensure the IAM role running the script has `logs:FilterLogEvents` permission on that log group.

## CI Integration

```yaml
- name: Network traffic analysis
  run: bash infrastructure/scripts/analyze-traffic.sh
  env:
    AWS_REGION: us-east-1
    FLOW_LOG_GROUP: /aws/vpc/gistpin-flow-logs
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
  continue-on-error: true  # alert but don't block deploy
```
