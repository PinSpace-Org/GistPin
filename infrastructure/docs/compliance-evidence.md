# Infrastructure Compliance Evidence Collection

## Overview

Automated collection of compliance evidence for SOC 2, CIS, and PCI DSS audits. Evidence is organized by control category, retained for the required period, and formatted into audit-ready reports.

## Supported Frameworks

| Framework | Controls | Description |
|-----------|----------|-------------|
| SOC 2     | CC6.1-CC8.1 | Service Organization Control Type II |
| CIS       | 1.1-5.1 | Center for Internet Security Benchmark |
| PCI DSS   | 1.0-12.0 | Payment Card Industry Data Security Standard |

## Usage

```bash
# Collect SOC 2 evidence
./infrastructure/scripts/collect-evidence.sh --framework soc2

# Generate audit report
python3 infrastructure/scripts/generate-audit-report.py \
  infrastructure/ci/evidence/soc2/<timestamp> \
  soc2

# Collect CIS evidence
./infrastructure/scripts/collect-evidence.sh --framework cis
```

## Evidence Categories

### Network
- Kubernetes NetworkPolicies
- Ingress rules
- Security groups
- WAF configuration
- VPC flow logs

### IAM
- IAM policies and roles
- Service accounts
- Role bindings
- Access analyzer findings

### Encryption
- KMS keys
- S3 bucket encryption
- TLS certificates
- Secrets management
- EBS encryption

### Monitoring
- CloudTrail configuration
- GuardDuty detectors
- AWS Config rules
- Alert rules
- Prometheus configuration

### Logging
- CloudWatch log groups
- Kubernetes events
- Fluentd configuration
- Audit logs

### Configuration
- Terraform variables
- Provider configuration
- Backend configuration
- ConfigMaps
- Pod specifications

## Evidence Retention

Default retention: 2555 days (7 years) as required by SOC 2. Configurable via `--retention` flag.

## Report Format

The audit report includes:
- Executive summary with pass/fail metrics
- Category-level breakdown with pass rates
- Control-by-control status with evidence file counts
- Remediation priorities for failing controls

## CI Integration

Evidence collection runs:
- Weekly via scheduled GitHub Actions
- On-demand via workflow_dispatch
- Automatically before scheduled audits

## File Organization

```
evidence/
└── soc2/
    └── 20240101-120000/
        ├── manifest.json
        ├── soc2-audit-report.md
        ├── soc2-audit-summary.json
        ├── network/
        │   ├── network-policies.yaml
        │   └── ...
        ├── iam/
        ├── encryption/
        ├── monitoring/
        ├── logging/
        └── configuration/
```
