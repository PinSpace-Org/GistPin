# Infrastructure Compliance Checks

Automated compliance validation for GistPin covering CIS Benchmarks, GDPR, and PCI-DSS.

## Files

| File | Purpose |
|---|---|
| `infrastructure/security/compliance-checks.sh` | Runs all compliance checks and writes a JSON report |
| `infrastructure/security/cis-benchmarks.yml` | Benchmark definitions and remediation guidance |

## Usage

```bash
# Run all checks (exits 0=all pass, 1=warnings, 2=critical failures)
bash infrastructure/security/compliance-checks.sh

# Override report output directory
REPORT_DIR=/tmp/compliance bash infrastructure/security/compliance-checks.sh

# Don't fail the pipeline on critical issues (audit-only mode)
FAIL_ON_CRITICAL=false bash infrastructure/security/compliance-checks.sh
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BENCHMARKS_FILE` | `infrastructure/security/cis-benchmarks.yml` | Benchmark definitions file |
| `REPORT_DIR` | `infrastructure/ci/reports` | Directory for JSON audit reports |
| `FAIL_ON_CRITICAL` | `true` | Exit 2 if any CRITICAL check fails |

## Checks Performed

### CIS Benchmarks (OS/SSH)
- **CIS-1.1** SSH root login disabled (CRITICAL)
- **CIS-1.2** SSH password authentication disabled (HIGH)
- **CIS-1.3** Automatic security updates enabled (HIGH)

### CIS Benchmarks (Network)
- **CIS-2.1** Host firewall active (CRITICAL)
- **CIS-2.2** IP forwarding disabled (MEDIUM)

### CIS Benchmarks (Kubernetes)
- **CIS-3.1** Anonymous API access denied (CRITICAL)
- **CIS-3.2** Secrets encrypted at rest (HIGH)

### GDPR
- **GDPR-1** Data retention policy in Terraform (HIGH)
- **GDPR-2** Encryption in transit configured (HIGH)

### PCI-DSS
- **PCI-1** Audit logging enabled (CRITICAL)
- **PCI-2** MFA enforced for privileged access (HIGH)

## Report Format

Reports are written as JSON to `REPORT_DIR/compliance-report-<timestamp>.json`:

```json
{
  "timestamp": "2026-06-01T09:00:00Z",
  "summary": { "pass": 9, "fail": 2, "critical_failures": 1 },
  "results": [
    { "id": "CIS-1.1", "description": "...", "severity": "CRITICAL", "status": "PASS", "detail": "" }
  ]
}
```

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Compliance checks
  run: bash infrastructure/security/compliance-checks.sh
  env:
    FAIL_ON_CRITICAL: "true"
    REPORT_DIR: infrastructure/ci/reports
```
