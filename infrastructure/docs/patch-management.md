# Patch Management

## Overview

GistPin uses AWS Systems Manager (SSM) Patch Manager to automate OS patching across all managed EC2 instances. Patch baselines define which patches are approved or rejected, maintenance windows schedule when patching occurs, and AWS Config rules track compliance posture.

## Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  Patch Baselines │────>│ Maintenance Windows   │────>│ Compliance Rules │
│  (ssm-patch.tf)  │     │ (maintenance-windows) │     │ (AWS Config)     │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
        │                         │                           │
        │                         ▼                           ▼
        │                 ┌──────────────┐           ┌──────────────────┐
        │                 │ EC2 Instances│           │ CloudWatch Alerts│
        │                 │ (PatchGroup) │           │ (SNS → Email)    │
        │                 └──────────────┘           └──────────────────┘
        ▼
┌──────────────────┐
│  Default Baseline│
│  Activation      │
└──────────────────┘
```

## Patch Baselines

Defined in `infrastructure/terraform/ssm-patch.tf`:

| Baseline | OS | Approval Window | Severity Filter |
|----------|----|-----------------|-----------------|
| Amazon Linux 2 | AMAZON_LINUX_2 | 7d (Security/Bugfix), 14d (Enhancement) | Critical, Important |
| Ubuntu 22.04 | UBUNTU | 7d (required/important), 14d (optional) | security, updates |
| Windows Server 2022 | WINDOWS | 7d (Critical/Important), 14d (Moderate) | CriticalUpdates, SecurityUpdates |

### Rejection Rules

- **Amazon Linux 2**: Kernel patches and unspecified severity are rejected
- **Ubuntu**: Extra priority patches are rejected
- **Windows**: Windows Defender updates are rejected

## Patch Groups

Patch groups map instances to their appropriate baseline:

| Patch Group | Baseline | Environment |
|-------------|----------|-------------|
| `production-linux` | Amazon Linux 2 | Production |
| `production-ubuntu` | Ubuntu 22.04 | Production |
| `production-windows` | Windows Server 2022 | Production |
| `staging-linux` | Amazon Linux 2 | Staging |
| `staging-ubuntu` | Ubuntu 22.04 | Staging |
| `staging-windows` | Windows Server 2022 | Staging |

### Tagging Instances

Tag EC2 instances with `PatchGroup` to assign them to a maintenance schedule:

```bash
aws ec2 create-tags \
  --resources i-0abc123def456 \
  --tags Key=PatchGroup,Value=production-linux
```

## Maintenance Windows

Defined in `infrastructure/terraform/maintenance-windows.tf`:

| Window | Schedule | Duration | Scope |
|--------|----------|----------|-------|
| Prod Linux | Saturday 03:00 UTC | 4 hours | Tagged Linux/Ubuntu instances |
| Prod Windows | Sunday 02:00 UTC | 5 hours | Tagged Windows instances |

### Task Execution Order

Each maintenance window runs two tasks sequentially:

1. **Scan** (`AWS-RunPatchBaseline` with `Operation: Scan`) — identifies missing patches
2. **Install** (`AWS-RunPatchBaseline` with `Operation: Install`) — applies approved patches

### Concurrency & Error Handling

| Parameter | Linux Window | Windows Window |
|-----------|-------------|----------------|
| Scan concurrency | 50% | 50% |
| Scan max errors | 25% | 25% |
| Install concurrency | 25% | 25% |
| Install max errors | 10% | 10% |

Patches trigger a reboot only when required (`RebootIfNeeded`).

## Compliance Reporting

### AWS Config Rule

The `managed_instance_patch_compliance` Config rule continuously evaluates whether managed instances are compliant with their assigned patch baseline.

Check compliance status:

```bash
# List non-compliant instances
aws configservice get-compliance-details-by-config-rule \
  --config-rule-name gistpin-dev-patch-compliance \
  --compliance-types NON_COMPLIANT \
  --query 'EvaluationResults[].EvaluationResultIdentifier.EvaluationResultQualifier.ResourceId'

# Get overall compliance summary
aws configservice get-aggregate-compliance-summary \
  --configuration-aggregator-name gistpin \
  --filters ConfigRuleName=gistpin-dev-patch-compliance
```

### Manual Compliance Check

```bash
# Scan a specific instance
aws ssm send-command \
  --document-name "AWS-RunPatchBaseline" \
  --targets "Key=instanceids,Values=i-0abc123def456" \
  --parameters '{"Operation":["Scan"]}' \
  --max-concurrency "1" \
  --max-errors "0"

# List patch compliance data
aws ssm list-compliance-summaries \
  --filters "Key=PatchGroup,Values=production-linux" \
  --query 'ComplianceSummaryItems[].ComplianceSeverity'
```

## Non-Compliant Instance Alerts

CloudWatch alarms notify when instances fall out of compliance:

| Alarm | Condition | Severity |
|-------|-----------|----------|
| `patch-non-compliant` | > 0 non-compliant instances (hourly check) | Critical |
| `patch-scan-errors` | Any patch scan task failures (daily check) | Warning |

Alerts are delivered to the SNS topic `{project}-{env}-patch-alerts`.

### Subscribing to Alerts

```bash
# Subscribe via CLI
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:gistpin-dev-patch-alerts \
  --protocol email \
  --notification-endpoint ops-team@pinspace.org
```

## Emergency Patching

For out-of-window critical patches (e.g., zero-day vulnerabilities):

```bash
# Scan all instances in a patch group
aws ssm send-command \
  --document-name "AWS-RunPatchBaseline" \
  --targets "Key=tag:PatchGroup,Values=production-linux" \
  --parameters '{"Operation":["Install"],"RebootOption":["RebootIfNeeded"]}' \
  --max-concurrency "10%" \
  --max-errors "5%"

# Monitor command status
aws ssm list-command-invocations \
  --command-id COMMAND_ID \
  --details
```

## Terraform Resources

| Resource | File | Purpose |
|----------|------|---------|
| `aws_ssm_patch_baseline.*` | `ssm-patch.tf` | Patch approval/rejection rules per OS |
| `aws_ssm_patch_group.*` | `ssm-patch.tf` | Maps patch groups to baselines |
| `aws_ssm_default_patch_baseline.*` | `ssm-patch.tf` | Default baseline for untagged instances |
| `aws_ssm_maintenance_window.*` | `maintenance-windows.tf` | Scheduled patching windows |
| `aws_ssm_maintenance_window_target.*` | `maintenance-windows.tf` | Instance targeting by tag |
| `aws_ssm_maintenance_window_task.*` | `maintenance-windows.tf` | Scan and install task definitions |
| `aws_config_config_rule.*` | `maintenance-windows.tf` | Compliance evaluation |
| `aws_cloudwatch_metric_alarm.*` | `maintenance-windows.tf` | Non-compliance alerting |
| `aws_sns_topic.*` | `maintenance-windows.tf` | Alert notification delivery |
