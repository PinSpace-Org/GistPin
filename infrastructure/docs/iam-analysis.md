# IAM Access Analysis

IAM Access Analyzer for GistPin AWS accounts to identify resources shared with external principals.

## Overview

IAM Access Analyzer continuously monitors AWS resources for access from outside the account. It identifies resources such as S3 buckets, IAM roles, KMS keys, Lambda functions, SQS queues, and Secrets Manager secrets that are shared with external principals.

## Analyzer Configuration

The analyzer is deployed via Terraform in `infrastructure/terraform/iam-analyzer.tf` and uses the `ACCOUNT` zone type to analyze access within the current account.

| Resource | Type | Purpose |
|----------|------|---------|
| `aws_accessanalyzer_analyzer.account` | ACCOUNT | Per-account access analysis |
| `aws_accessanalyzer_archive_rule.ignore_aws_service` | Archive Rule | Ignores AWS service roles |
| `aws_accessanalyzer_archive_rule.ignore_service_linked` | Archive Rule | Ignores service-linked roles |

## Alerting

Findings are published to CloudWatch Events and forwarded to SNS. Alerting rules in `infrastructure/monitoring/iam-alerts.yml` define severity levels:

| Alert | Severity | Threshold |
|-------|----------|-----------|
| IAMUnusedAccess | warning | > 0 findings |
| IAMExternalAccess | critical | > 0 findings |
| IAMCrossAccountAccess | high | > 0 findings |
| IAMAnalyzerHighSeverity | critical | > 0 findings |
| IAMAnalyzerActiveFindings | warning | > 10 active |

## Remediation

1. Review each finding via the AWS Console or CLI
2. Determine if the external access is intentional
3. If unintentional, remove the external principal from the resource policy
4. Update archive rules to suppress known-good findings
5. Document the exception in the finding archive

## Related Resources

- [Terraform Configuration](../terraform/iam-analyzer.tf)
- [Alerting Rules](../monitoring/iam-alerts.yml)
- [AWS IAM Access Analyzer Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)
