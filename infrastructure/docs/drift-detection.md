# Infrastructure Drift Detection

Detects manual changes to GistPin infrastructure by comparing actual state against Terraform and Kubernetes manifests.

## Scripts

### `detect-drift.sh`
Runs `terraform plan` and compares live Kubernetes resources against manifests. Writes a JSON report and optionally alerts via Slack or auto-remediates.

**Environment variables:**
| Variable | Default | Description |
|---|---|---|
| `TERRAFORM_DIR` | `infrastructure/terraform` | Terraform working directory |
| `REPORT_DIR` | `infrastructure/ci/reports` | Output directory for drift reports |
| `SLACK_WEBHOOK` | _(empty)_ | Slack webhook URL for alerts |
| `AUTO_REMEDIATE` | `false` | Set to `true` to run `terraform apply` on drift |

**Exit codes:** `0` = no drift, `1` = drift detected

```bash
# Detect drift (report only)
bash infrastructure/scripts/detect-drift.sh

# Detect and auto-remediate Terraform drift
AUTO_REMEDIATE=true bash infrastructure/scripts/detect-drift.sh

# With Slack alerts
SLACK_WEBHOOK="https://hooks.slack.com/..." bash infrastructure/scripts/detect-drift.sh
```

### `drift-report.sh`
Renders the latest (or a specified) drift report in text, JSON, or Markdown format.

```bash
# Human-readable text (default)
bash infrastructure/scripts/drift-report.sh

# Markdown (for GitHub PR comments)
OUTPUT_FORMAT=markdown bash infrastructure/scripts/drift-report.sh

# Raw JSON
OUTPUT_FORMAT=json bash infrastructure/scripts/drift-report.sh

# Specific report file
bash infrastructure/scripts/drift-report.sh infrastructure/ci/reports/drift-20260601-090000.json
```

## Report Format

```json
{
  "timestamp": "2026-06-01T09:00:00Z",
  "terraform_drift": [
    { "resource": "aws_security_group.backend", "action": ["update"], "reason": "manual change" }
  ],
  "kubernetes_drift": [
    { "manifest": "infrastructure/k8s/backend-deployment.yaml", "kind": "Deployment", "name": "backend", "namespace": "default" }
  ]
}
```

## CI Integration

```yaml
- name: Detect infrastructure drift
  run: bash infrastructure/scripts/detect-drift.sh
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK }}
    AUTO_REMEDIATE: "false"

- name: Post drift report
  if: failure()
  run: OUTPUT_FORMAT=markdown bash infrastructure/scripts/drift-report.sh >> $GITHUB_STEP_SUMMARY
```

## Change Tracking

All drift reports are stored in `infrastructure/ci/reports/drift-<timestamp>.json`. Commit these files to maintain a change audit trail, or ship them to an S3 bucket for long-term retention.

## Auto-Remediation

When `AUTO_REMEDIATE=true`, `detect-drift.sh` runs `terraform apply -auto-approve` after detecting drift. Use with caution — only enable in environments where automated changes are safe (e.g., staging). Production remediation should always require a human approval step.
