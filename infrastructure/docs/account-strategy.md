# Multi-Account AWS Organization Strategy

This document describes the AWS Organizations structure used by GistPin to isolate workloads, enforce security guardrails, and consolidate billing.

## Organizational Structure

```
gistpin-org (Management Account)
├── security/           — Security tooling, GuardDuty, SecurityHub, audit
├── logging/            — Centralized CloudTrail, Config, log archival
├── shared-services/    — Shared tooling, Cost Explorer, image registry
└── workloads/
    ├── dev/            — Development and feature branches
    ├── staging/        — Pre-production validation
    └── prod/           — Production traffic
```

## Account Purposes

| Account | Purpose | Key Services |
|---------|---------|-------------|
| Management | Billing, IAM, org admin | Organizations, Billing |
| Security | Centralized security | GuardDuty, SecurityHub, IAM Access Analyzer |
| Logging | Audit trail retention | CloudTrail, Config, S3 log archival |
| Shared Services | Common tooling | ECR, Cost Explorer, SSO |
| Dev | Active development | Full dev stack per workspace |
| Staging | Pre-production | Mirror of prod, scaled down |
| Prod | Live traffic | Full production stack |

## Service Control Policies (SCPs)

The following SCPs are attached to enforce organization-wide guardrails:

| Policy | Description | Attached To |
|--------|-------------|-------------|
| `GistPinDenyRootUser` | Block root user access in member accounts | Root |
| `GistPinDenyLeaveOrg` | Prevent accounts from leaving the organization | Root |
| `GistPinEnforceIMDSv2` | Require IMDSv2 on all EC2 instances | Root |
| `GistPinEnforceEncryption` | Require KMS encryption for S3/EBS | Root |
| `GistPinRestrictRegions` | Limit workloads to approved regions | Workloads OU |

### Approved Regions

| Region | Purpose |
|--------|---------|
| `us-east-1` | Primary — global services, CloudFront |
| `us-west-2` | DR / West Coast latency |
| `eu-west-1` | EU data residency |

## Cross-Account Access

Cross-account access uses IAM roles with the following pattern:

1. **Organization Access Role** — Assumed by the management account for administrative tasks
2. **Security Audit Role** — Assumed by the security account with `SecurityAudit` policy
3. **External ID** — Required for cross-account AssumeRole to prevent confused-deputy attacks

## Account Vending

New accounts are provisioned via Terraform (`aws-org.tf`). To add a new environment:

1. Add the account email to `var.environment_accounts` in `terraform.tfvars`
2. Map it to the correct OU in the `lookup()` block in `aws_organizations_account.environment`
3. Run `terraform plan` and `terraform apply`

```
terraform plan -var-file="env/prod.tfvars"
```

## Billing

- Consolidated billing is enabled at the organization level
- Cost allocation tags (`Project: gistpin`, `ManagedBy: terraform`) are applied to all resources
- The shared-services account has Cost Explorer admin access
- Budget alerts are routed to the `#gistpin-costs` Slack channel via `budget-alerts.yml`

## Incident Response

When a security finding is detected:

1. GuardDuty events flow from all accounts to the **security** account
2. SecurityHub aggregates findings centrally
3. Alerts route through `audit-alerts.yml` and `guardduty-alerts.yml`
4. The security team assumes the `OrganizationAccessRole` into affected accounts
5. Findings are logged to the **logging** account's CloudTrail

## Adding New Environments

1. Create a new account entry in `var.environment_accounts`
2. Select the parent OU (`dev`, `staging`, or `prod`)
3. The cross-account role is automatically created
4. SCPs are inherited from the OU and root targets
5. Run `terraform apply` to provision

## Terraform Files

| File | Contents |
|------|----------|
| `aws-org.tf` | Organization, OUs, member accounts, cross-account roles |
| `org-policies.tf` | SCPs for security guardrails and region restrictions |
