# Service Control Policy Strategy

This document describes the Service Control Policy (SCP) strategy for the GistPin AWS Organization, including enforcement stages, policy purposes, and deployment procedures.

## Overview

SCPs are organization-level permission boundaries that apply to all IAM entities in member accounts. They define the **maximum permissions** — even an account administrator cannot exceed the boundaries set by SCPs.

```
Root Account (Management)
├── SCP: All member-account policies
│
├── security/
├── logging/
├── shared-services/
│
└── workloads/
    ├── dev/       — All root SCPs + region restriction + IAM restriction
    ├── staging/   — All root SCPs + region restriction + IAM restriction
    └── prod/      — All root SCPs + region restriction + IAM restriction + region lock
```

## Active SCPs

| Policy | Purpose | Attached To | Audit Mode |
|--------|---------|-------------|------------|
| `GistPinDenyRootUser` | Block root user in member accounts | Root | Yes |
| `GistPinDenyLeaveOrg` | Prevent accounts from leaving org | Root | No |
| `GistPinRestrictRegions` | Limit to approved regions | Workloads OU | Yes |
| `GistPinDenyDangerousIAM` | Block privilege escalation paths | Workloads OU | Yes |
| `GistPinDenyBillingModification` | Prevent billing changes | Root | Yes |
| `GistPinEnforceIMDSv2` | Require IMDSv2 on EC2 | Root | No |
| `GistPinDenyS3PublicAccess` | Prevent public S3 buckets | Root | No |
| `GistPinDenyOpenSecurityGroups` | Block 0.0.0.0/0 ingress | Root | No |
| `GistPinDenyCloudTrailTampering` | Protect CloudTrail config | Root | No |
| `GistPinProdRegionLock` | Lock prod to us-east-1 | Prod OU | No |

## Audit-Only Mode

SCPs are deployed in **audit-only mode** by default. In audit-only mode, policies use `NotAction` to allow all actions while logging which actions would be denied. This lets us validate policy impact before enforcement.

### Enabling Enforcement

1. Set `scp_audit_only = false` in Terraform
2. Review the plan to confirm which actions will be blocked
3. Apply changes — policies immediately enforce Deny rules
4. Monitor CloudTrail for denied actions in the first 72 hours

```hcl
# Enable enforcement mode
variable "scp_audit_only" {
  default = false  # Changed from true
}
```

### Audit-Only vs Enforcement

| Mode | Behavior | Risk |
|------|----------|------|
| Audit-only (`true`) | Logs would-be denials, allows all actions | None — safe to deploy |
| Enforcement (`false`) | Actively denies specified actions | May break existing workflows |

## Policy Details

### 1. Deny Root User

**Why**: Root credentials have unlimited access. AWS best practice is to never use root for daily operations.

**Scope**: All member accounts (Root attachment)

**Exceptions**: None — root access is blocked universally in member accounts.

**Impact**: If anyone currently uses root credentials, they will be immediately blocked.

### 2. Restrict Regions

**Why**: Limits blast radius, ensures compliance with data residency requirements, and prevents cost sprawl.

**Approved Regions**:

| Region | Purpose |
|--------|---------|
| `us-east-1` | Primary — global services, CloudFront, Route 53 |
| `us-west-2` | DR, West Coast latency reduction |
| `eu-west-1` | EU data residency, GDPR compliance |

**Scope**: Workloads OU (not security/logging/shared-services, which need global access)

**Exceptions**: Global services (IAM, Route 53, CloudFront, etc.) are always accessible.

### 3. Deny Dangerous IAM

**Why**: Prevents privilege escalation, unauthorized role creation, and policy tampering.

**Blocked Actions**:
- Create/delete policies and roles
- Attach AdministratorAccess policy
- Create access keys for users
- Modify assume role trust policies

**Exceptions**: `GistPinTerraformRole` and `GistPinAdminRole` can manage IAM for automation.

### 4. Deny Billing Modification

**Why**: Prevents cost surprises from unauthorized budget changes or payment method modifications.

**Blocked Actions**:
- Modify billing contact information
- Create/delete/modify budgets
- Change payment methods
- Leave the organization

**Exceptions**: `GistPinTerraformRole` and `GistPinCostAdminRole` can manage cost anomaly detection.

### 5. Enforce IMDSv2

**Why**: Prevents SSRF-based credential theft through instance metadata.

**Scope**: All accounts (Root attachment)

**Impact**: Any EC2 instance launched without IMDSv2 will fail to start.

### 6. Deny S3 Public Access

**Why**: Prevents accidental data exposure through public S3 buckets.

**Scope**: All accounts (Root attachment)

**Impact**: Buckets cannot be made public via API, CLI, or console.

### 7. Deny Open Security Groups

**Why**: Prevents unrestricted ingress (0.0.0.0/0) on security groups.

**Scope**: All accounts (Root attachment)

**Impact**: Security groups cannot be created or modified to allow 0.0.0.0/0 ingress.

### 8. Deny CloudTrail Tampering

**Why**: Protects audit trail integrity — critical for incident response and compliance.

**Scope**: All accounts (Root attachment)

**Impact**: Cannot stop, delete, or modify CloudTrail configurations.

## Deployment Procedure

### Initial Deployment

```bash
# 1. Deploy SCPs in audit-only mode
terraform apply -var="scp_audit_only=true"

# 2. Verify SCPs are attached
aws organizations list-policies --filter SERVICE_CONTROL_POLICY
aws organizations list-targets-for-policy --policy-id <policy-id>

# 3. Monitor CloudTrail for denied actions
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AccessDenied \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S)

# 4. After 7 days of audit-only, enable enforcement
terraform apply -var="scp_audit_only=false"
```

### Adding a New SCP

1. Create the policy in `scps.tf`
2. Create the attachment in `scp-attachments.tf`
3. Deploy in audit-only mode first
4. Monitor for 7 days
5. Enable enforcement

### Emergency Override

SCPs cannot be overridden by member accounts. To temporarily bypass an SCP:

```bash
# Option 1: Detach the specific policy
aws organizations detach-policy --policy-id <policy-id> --target-id <target-id>

# Option 2: Move the account to an OU without the restrictive SCP
aws organizations move-account \
  --account-id <account-id> \
  --source-parent-id <current-ou-id> \
  --destination-parent-id <temporary-ou-id>
```

## Monitoring and Alerting

### CloudTrail Events to Monitor

| Event | Source | Action |
|-------|--------|--------|
| `AttachPolicy` | Organizations | SCP attachment changes |
| `DetachPolicy` | Organizations | SCP detachment (potential bypass) |
| `CreatePolicyVersion` | Organizations | SCP modifications |
| `UpdateRolePolicyToAssumeRole` | IAM | Trust policy changes |
| `PutBucketPublicAccessBlock` | S3 | Blocked by SCP |
| `AuthorizeSecurityGroupIngress` | EC2 | Blocked by SCP |

### Recommended CloudWatch Alarms

```json
{
  "AlarmName": "SCP-Bypass-Attempt",
  "MetricName": "DetachPolicy",
  "Namespace": "AWS/Organizations",
  "Statistic": "Sum",
  "Period": 300,
  "EvaluationPeriods": 1,
  "Threshold": 1,
  "ComparisonOperator": "GreaterThanOrEqualToThreshold",
  "AlarmActions": ["arn:aws:sns:us-east-1:123456789:security-alerts"]
}
```

## Known Issues and Limitations

### 1. SCP Maximum Attached

AWS limits organizations to **5 SCPs** attached per target (OU or root). With our current 10 policies, we use multiple OU-level attachments strategically.

**Workaround**: Combine related policies where possible, or use AWS Firewall Manager for policies that exceed the 5-SCP limit.

### 2. SCP Evaluation Order

SCPs are evaluated **before** IAM policies. A Deny in an SCP cannot be overridden by an Allow in an IAM policy.

**Implication**: Ensure Terraform roles are explicitly exempted from restrictive SCPs.

### 3. Management Account Exemption

SCPs do **not** apply to the management account. Root user access in the management account cannot be restricted via SCPs.

**Mitigation**: Use IAM policies and AWS Config rules on the management account itself.

### 4. Service-Linked Roles

Some AWS services create service-linked roles that may conflict with IAM restriction SCPs.

**Workaround**: The `DenyDangerousIAM` SCP explicitly allows `aws-service-role/*` ARNs.

### 5. Audit-Only Mode Limitations

Audit-only mode using `NotAction` does not perfectly simulate enforcement. Some edge cases (condition keys, resource-level permissions) may behave differently.

**Recommendation**: Run in audit-only for at least 7 days and thoroughly review CloudTrail logs before enabling enforcement.

## Rollback Procedure

If an SCP causes unexpected breakage:

1. **Immediate**: Detach the problematic policy
   ```bash
   aws organizations detach-policy --policy-id <id> --target-id <target>
   ```
2. **Investigate**: Review CloudTrail for denied actions
3. **Fix**: Update the SCP in Terraform to add exceptions
4. **Redeploy**: Apply updated SCP in audit-only mode
5. **Validate**: Monitor for 7 days before re-enabling enforcement

## Maintenance Schedule

| Task | Frequency | Responsible |
|------|-----------|-------------|
| Review SCP audit logs | Weekly | Security team |
| Update approved regions | Quarterly | Platform team |
| Review IAM exceptions | Monthly | Security team |
| Test rollback procedure | Quarterly | Platform team |
| Update SCP documentation | On change | Platform team |
