# State Management

## Overview

GistPin uses Terraform with an S3 backend and DynamoDB locking for state management. State files are stored in versioned S3 buckets with encryption enforced.

## Bucket Structure

| Bucket | Purpose |
|--------|---------|
| `gistpin-state-{env}` | Primary Terraform state storage |
| `gistpin-tf-access-logs-{env}` | S3 access logging for state bucket |
| `gistpin-terraform-state-{env}` | Legacy/provisioning state storage |

State keys follow the pattern: `gistpin/terraform.tfstate`

## Locking

DynamoDB table `gistpin-state-locks-{env}` manages concurrent access. The lock table uses:
- PAY_PER_REQUEST billing mode
- Server-side encryption enabled
- Point-in-time recovery enabled

### Forcing a Lock Release

```bash
# Remove stale lock (use cautiously)
terraform force-unlock <LOCK_ID>
```

## Lifecycle Rules

- Noncurrent state versions expire after 90 days
- Incomplete multipart uploads abort after 7 days
- Access logs retained for 365 days
- Old state versions retained for audit and recovery

## Recovery Procedures

### State Corruption Recovery

1. Identify the last known good state version in S3:

```bash
aws s3api list-object-versions --bucket gistpin-state-staging \
  --prefix gistpin/terraform.tfstate
```

2. Restore to a specific version:

```bash
aws s3api get-object --bucket gistpin-state-staging \
  --key gistpin/terraform.tfstate \
  --version-id <VERSION_ID> \
  restored.tfstate
```

3. Push restored state:

```bash
terraform state push restored.tfstate
```

### State Migration

```bash
bash infrastructure/scripts/migrate-state.sh migrate path/to/new-backend.tf
```

### Full State Replacement

```bash
# Backup existing state
terraform state pull > backup.tfstate

# Re-initialize with new backend
terraform init -migrate-state
```

## Best Practices

1. Never edit `.tfstate` files manually
2. Always enable versioning on state buckets
3. Use DynamoDB locking in all environments
4. Run `terraform plan` before `terraform apply`
5. Store sensitive output in AWS Secrets Manager, not state
6. Regularly audit state with `validate-state.sh`
