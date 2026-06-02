# Cost Optimization

Automated tooling to reduce cloud spend for GistPin infrastructure.

## Scripts

| Script | Purpose |
|--------|---------|
| `infrastructure/scripts/optimize-costs.sh` | Orchestrates all cost checks and produces a JSON report |
| `infrastructure/scripts/find-idle-resources.sh` | Detects idle k8s pods, scaled-down deployments, unbound PVCs, and idle EC2 instances |

## Usage

```bash
# Run full cost optimisation analysis
bash infrastructure/scripts/optimize-costs.sh

# Scan for idle resources only
bash infrastructure/scripts/find-idle-resources.sh
```

Reports are written to `infrastructure/reports/cost/cost-report-<timestamp>.json`.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REPORT_DIR` | `infrastructure/reports/cost` | Output directory for reports |
| `IDLE_CPU_THRESHOLD` | `5` | CPU % below which a resource is considered idle |
| `IDLE_MEM_THRESHOLD` | `10` | Memory % below which a resource is considered idle |
| `ENVIRONMENT` | `unknown` | Label written into the report |

## Requirements

- `jq` — JSON processing
- `kubectl` + metrics-server — for Kubernetes checks (optional)
- AWS CLI with `ce:GetReservationCoverage` permission — for RI analysis (optional)

## Recommendations workflow

1. Run `optimize-costs.sh` on a schedule (e.g. weekly cron).
2. Review the generated report and the idle-resource output.
3. Right-size or terminate identified resources.
4. Re-run to confirm savings.
