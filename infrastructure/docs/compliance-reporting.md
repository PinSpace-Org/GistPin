# Compliance Reporting

Automated generation of SOC2 evidence, GDPR compliance checks, and audit trails.

## Scripts

| Path | Purpose |
|------|---------|
| `infrastructure/scripts/compliance-report.sh` | Orchestrates all compliance checks and writes a JSON report |
| `infrastructure/security/compliance-checks/gdpr-data-retention.sh` | Verifies data-retention policy is configured |
| `infrastructure/security/compliance-checks/soc2-secrets-management.sh` | Verifies secrets are managed via sealed/external-secrets |

## Usage

```bash
# Run full compliance report
bash infrastructure/scripts/compliance-report.sh

# Run a single check
bash infrastructure/security/compliance-checks/gdpr-data-retention.sh
```

Reports are written to `infrastructure/reports/compliance/`.  
Evidence artefacts are stored under `infrastructure/reports/compliance/evidence/`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORT_DIR` | `infrastructure/reports/compliance` | Output directory for reports |
| `EVIDENCE_DIR` | `infrastructure/reports/compliance/evidence` | Evidence artefact directory |
| `ENVIRONMENT` | `unknown` | Label written into the report |

## Adding new checks

1. Create a new `*.sh` script in `infrastructure/security/compliance-checks/`.
2. Exit `0` for pass, non-zero for fail.
3. The orchestrator picks it up automatically on the next run.

## Scheduling

Add a Kubernetes CronJob or GitHub Actions scheduled workflow to run `compliance-report.sh` weekly and upload the report as an artefact.
