# AWS Security Hub — Compliance Aggregation

Central hub for security findings across the GistPin AWS environment. Implements
enablement, the CIS AWS Foundations Benchmark, cross-region finding
aggregation, automated remediation for common findings, and a weekly
compliance report.

Related issue: `#757 Setup AWS Security Hub for compliance aggregation`

## Architecture

```
                     ┌─────────────────────────┐
                     │   AWS Security Hub       │
                     │  (CIS + FSBP standards)  │
                     └───────────┬──────────────┘
                                 │ findings
                 ┌───────────────┼───────────────────┐
                 │                                   │
        EventBridge rule                    EventBridge schedule
      (finding imported, matches                (weekly, Mon 08:00 UTC)
       remediation allow-list)                          │
                 │                                   ▼
                 ▼                        compliance-report Lambda
     remediation Lambda                  (queries findings, writes
   (fixes issue, updates finding,          report to S3, notifies SNS)
        notifies SNS)                                 │
                 │                                   ▼
                 ▼                         S3: compliance report bucket
           SNS: security-hub-remediation-alerts (email)
```

Finding aggregation is enabled via `aws_securityhub_finding_aggregator`, which
consolidates findings from all linked regions into the home region so a
single Security Hub view reflects the account's full posture.

## Components

| Component | File | Purpose |
|---|---|---|
| Terraform module | `infrastructure/terraform/security-hub.tf` | Enables Security Hub, subscribes to standards, sets up aggregation, remediation Lambda + EventBridge rule, and the weekly report Lambda + schedule. |
| Remediation Lambda | `infrastructure/lambda/remediation/index.py` | Automated fix-on-finding, triggered by EventBridge. |
| Compliance report Lambda | `infrastructure/lambda/compliance-report/index.py` | Weekly summary of active findings, written to S3 and emailed via SNS. |
| CLI remediation script | `infrastructure/scripts/remediate-findings.sh` | Manual/SSM-runnable equivalent of the remediation Lambda, for ad-hoc fixes, dry runs, or environments without the Lambda wired up. |

## Standards enabled

- **CIS AWS Foundations Benchmark v1.4.0** — baseline hardening checks (root
  account usage, IAM password policy, CloudTrail, VPC flow logs, etc).
- **AWS Foundational Security Best Practices (FSBP) v1.0.0** — broader
  service-level checks; several auto-remediation rules below depend on FSBP
  control IDs (e.g. `S3.8`, `EC2.19`).

Toggle CIS with the `enable_cis_standard` Terraform variable; FSBP is always
subscribed since remediation depends on it.

## Finding aggregation

`aws_securityhub_finding_aggregator` is configured with `linking_mode =
"ALL_REGIONS"` by default. Set `linked_regions` to a specific list to
restrict aggregation to named regions instead (useful if the account only
operates in 2–3 regions and you want to avoid noise from unused ones).

## Automated remediation

The remediation Lambda subscribes to `Security Hub Findings - Imported`
events, filtered to `RecordState = ACTIVE`, `Workflow.Status IN (NEW,
NOTIFIED)`, and a `GeneratorId` allow-list (`remediation_finding_types`
variable). Currently supported:

| Finding | Action taken |
|---|---|
| `FSBP S3.8` — S3 bucket allows public access | Applies `PutPublicAccessBlock` with all four blocks enabled. |
| `CIS 2.1.1` — S3 bucket not encrypted | Enables default SSE-S3 (`AES256`) bucket encryption. |
| `FSBP EC2.19` — Security group open to the world on a high-risk port | Revokes the `0.0.0.0/0` ingress rule for ports 22, 3389, 3306, 5432, 1433, 27017. |
| `CIS 1.12` / `FSBP IAM.6` — Root account usage / no hardware MFA on root | **Not auto-fixed.** Escalated via SNS for manual review — root-account changes are intentionally excluded from automation. |

Design principles:
- **Allow-list only.** Only `GeneratorId`s explicitly listed in
  `remediation_finding_types` trigger automation; everything else is left for
  manual triage in Security Hub.
- **Idempotent fixes.** Each remediation is safe to re-run (e.g. re-blocking
  public access on an already-blocked bucket is a no-op).
- **No destructive account-level changes.** Root-account and IAM-policy
  findings are escalated, never auto-modified.
- **Audit trail.** Every automated fix updates the finding's `Workflow.Status`
  to `RESOLVED` with a `Note` describing the action taken, and posts to the
  `security-hub-remediation-alerts` SNS topic.

To run the same fixes manually or via SSM Run Command:

```bash
./infrastructure/scripts/remediate-findings.sh --list
./infrastructure/scripts/remediate-findings.sh --scan --dry-run
./infrastructure/scripts/remediate-findings.sh --finding-type s3-public-access --bucket my-bucket
```

## Weekly compliance report

Runs every **Monday 08:00 UTC** (`compliance_report_schedule` variable). The
Lambda:

1. Pulls all `ACTIVE` findings with `Workflow.Status IN (NEW, NOTIFIED)`.
2. Summarizes by severity, compliance status, and standard.
3. Writes `reports/<date>/summary.json` and `reports/<date>/summary.md` to the
   `report_bucket_name` S3 bucket (encrypted at rest, public access blocked,
   365-day retention).
4. Publishes a short summary + S3 link to the `security-hub-remediation-alerts`
   SNS topic (email subscription configured via `notification_email`).

## Deployment

```bash
cd infrastructure/terraform
terraform init
terraform plan \
  -var="notification_email=security-team@example.com" \
  -var="report_bucket_name=gistpin-security-hub-reports"
terraform apply \
  -var="notification_email=security-team@example.com" \
  -var="report_bucket_name=gistpin-security-hub-reports"
```

Confirm the SNS email subscription after the first apply (AWS sends a
confirmation link to `notification_email`).

## Variables reference

| Variable | Default | Description |
|---|---|---|
| `aggregator_region` | `us-east-1` | Home region for the finding aggregator. |
| `linked_regions` | `[]` (all regions) | Regions to aggregate; empty = all. |
| `enable_cis_standard` | `true` | Toggle CIS AWS Foundations Benchmark. |
| `cis_standard_version` | `1.4.0` | CIS benchmark version. |
| `enable_auto_remediation` | `true` | Toggle the remediation Lambda + EventBridge rule. |
| `remediation_finding_types` | see `.tf` | GeneratorId allow-list for auto-remediation. |
| `compliance_report_schedule` | `cron(0 8 ? * MON *)` | Weekly report schedule. |
| `notification_email` | — (required) | Destination for SNS alerts/reports. |
| `report_bucket_name` | — (required) | S3 bucket for compliance reports. |

## Extending remediation coverage

To add a new auto-remediated finding type:

1. Add the `GeneratorId` to `remediation_finding_types` in
   `security-hub.tf`.
2. Add a matching handler in `infrastructure/lambda/remediation/index.py`
   (decorate with `@remediates("<generator-id>")`), and grant any new IAM
   permissions it needs in `aws_iam_role_policy.remediation_lambda`.
3. Add the equivalent manual fix function to
   `infrastructure/scripts/remediate-findings.sh` so operators can run it
   outside the Lambda path.
4. Test with `--dry-run` against a non-production account before enabling
   the EventBridge rule in production.

## Known limitations / follow-ups

- Cross-**account** aggregation (via Security Hub administrator/member
  accounts or AWS Organizations) is not yet wired up — this module covers
  cross-*region* aggregation within a single account. Tracked as a follow-up.
- The weekly report is a flat summary; trend-over-time comparison would
  require persisting historical summaries (e.g. via Athena over the S3
  reports) — not yet implemented.
- Auto-remediation currently covers 3 finding types; expand the allow-list
  incrementally as each new remediation is reviewed and tested.