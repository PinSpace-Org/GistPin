# Threat Detection — AWS GuardDuty

## Overview

GistPin uses Amazon GuardDuty for continuous threat detection across the AWS environment. GuardDuty monitors S3 data events, EKS audit logs, CloudTrail management events, and VPC flow logs to identify malicious activity.

## GuardDuty Setup

The GuardDuty detector is provisioned via Terraform (`infrastructure/terraform/guardduty.tf`). Configuration includes:

| Feature | Status | Details |
|---------|--------|---------|
| S3 Protection | Enabled | Monitors S3 data events for suspicious access patterns |
| EKS Protection | Enabled | Analyzes Kubernetes audit logs for cluster threats |
| Finding frequency | 15 minutes | How often GuardDuty publishes findings |

### Terraform Resources

- `aws_guardduty_detector.main` — the primary detector with S3 and EKS data sources
- `aws_guardduty_detector_feature.s3_protection` — S3 data events monitoring
- `aws_guardduty_detector_feature.eks_protection` — EKS audit log monitoring
- `aws_cloudwatch_event_rule.guardduty_finding` — captures findings to CloudWatch
- `aws_sns_topic.guardduty_alerts` — SNS topic for alert distribution

## Finding Types

### Critical Severity (≥ 7.0)

| Finding Type | Description | Action |
|-------------|-------------|--------|
| `UnauthorizedAccess:*` | Unauthorized API calls or resource access | Investigate immediately, rotate credentials |
| `PrivilegeEscalation:*` | IAM role escalation attempts | Disable compromised credentials, review IAM policies |
| `CredentialAccess:*` | Stolen or leaked credentials | Rotate all keys, audit CloudTrail |
| `CryptoCurrency:*` | Cryptocurrency mining activity | Terminate instances, isolate resources |
| `Policy:S3/BucketPublicAccessGranted` | S3 bucket made publicly accessible | Restrict bucket policy immediately |

### High Severity (≥ 4.0, < 7.0)

| Finding Type | Description | Action |
|-------------|-------------|--------|
| `Recon:*` | Port scanning or API enumeration | Block source IPs, review security groups |
| `Backdoor:*` | Reverse shell or C2 communication | Isolate resource, capture forensic data |
| `Behavior:*` | Anomalous IAM user behavior | Review recent API calls, verify with user |
| `Stealth:*` | Log tampering or CloudTrail disabling | Investigate IAM activity, re-enable logging |

### Medium Severity (≥ 1.0, < 4.0)

| Finding Type | Description | Action |
|-------------|-------------|--------|
| `Discovery:*` | Resource enumeration attempts | Review IAM permissions if legitimate |
| `PolicyViolation:*` | IAM role misuse or permission errors | Update IAM policies or educate users |
| `NetworkConnection:*` | Unusual outbound connections | Verify against known endpoints |

## Alert Routing

| Severity | Channel | Response Time | Escalation |
|----------|---------|---------------|------------|
| CRITICAL | PagerDuty page | 15 minutes | VP of Engineering after 30 min |
| HIGH | Slack #security | 1 hour | Security lead after 4 hours |
| MEDIUM | Jira ticket | 24 hours | Review on next sprint |

### Prometheus Alert Rules

Alert rules are defined in `infrastructure/monitoring/guardduty-alerts.yml`. Rules are grouped by severity with:

- **Critical rules**: `for: 1m` — fast detection for immediate escalation
- **High rules**: `for: 5m` — confirm persistence before notifying
- **Medium rules**: `for: 10m` — reduce noise from transient findings
- **Burst detection**: Alerts when finding rate exceeds 10 per minute

## Incident Response

### Triage Process

1. **Acknowledge** the alert via the designated channel (PagerDuty / Slack)
2. **Identify** the finding type and affected resource in the GuardDuty console
3. **Contain** the threat based on finding type:
   - S3 public access → apply bucket policy
   - Compromised credentials → rotate keys
   - Malicious EC2 instance → isolate via security group
4. **Investigate** root cause via CloudTrail and VPC flow logs
5. **Remediate** the underlying vulnerability
6. **Document** findings in the incident report

### Runbooks

Each alert annotation includes a `runbook` link pointing to this document. Specific runbooks are maintained in `infrastructure/docs/runbooks/`.

## Monitoring Dashboard

GuardDuty findings are published to CloudWatch metrics:

- `GuardDuty/CriticalFindings` — count of severity ≥ 7 findings
- `GuardDuty/HighFindings` — count of severity 4–7 findings
- `GuardDuty/MediumFindings` — count of severity 1–4 findings

These metrics are visualized in the Grafana security dashboard and trigger the alert rules defined above.

## Maintenance

GuardDuty updates threat intelligence feeds automatically. Review the following periodically:

1. **Quarterly**: Review finding types and update alert routing
2. **Monthly**: Verify CloudWatch metric filters and alarms
3. **After incidents**: Update runbooks and response procedures
