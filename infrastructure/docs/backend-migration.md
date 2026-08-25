# Terraform Backend Migration Tooling

## Overview

Safely migrate Terraform state backends without data loss. The migration tooling provides backup, lock management, resource-by-resource migration, and validation.

## Migration Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Backup    │────▶│   Acquire   │────▶│   Migrate   │────▶│   Validate  │
│   State     │     │    Lock     │     │  Resources  │     │  Migration  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                       │
                                                                  ┌────┴────┐
                                                                  │ Rollback │
                                                                  │ (if needed) │
                                                                  └─────────┘
```

## Quick Start

```bash
# Preview migration
./infrastructure/scripts/migrate-backend.sh \
  --source-backend "old/path/terraform.tfstate" \
  --dest-backend "new/path/terraform.tfstate" \
  --dry-run

# Execute migration
./infrastructure/scripts/migrate-backend.sh \
  --source-backend "old/path/terraform.tfstate" \
  --dest-backend "new/path/terraform.tfstate"

# Validate after migration
./infrastructure/scripts/validate-migrated-state.sh
```

## Features

### Pre-Migration State Backup
- Automatic backup before migration starts
- Timestamped backup files with size reporting
- Stored in `infrastructure/ci/backups/`

### Lock Management
- Automatic state lock acquisition
- Configurable retry with 30-second timeout
- Force-unlock on migration failure

### Resource-by-Resource Migration
- Uses `terraform init -migrate-state` for safe migration
- Automatic rollback on failure
- Preserves all resource associations

### Post-Migration Validation
- State access verification
- Terraform plan execution
- Resource count validation
- Drift detection
- Lock functionality check

### Rollback Capability
- Restores from pre-migration backup
- Triggered automatically on migration or validation failure

## Migration Types

### S3 to S3 (Same Account)
```bash
./migrate-backend.sh \
  --source-backend "old-bucket/terraform.tfstate" \
  --dest-backend "new-bucket/terraform.tfstate" \
  --dest-type s3
```

### S3 to S3 (Cross Account)
```bash
AWS_PROFILE=target-account ./migrate-backend.sh \
  --source-backend "source-bucket/terraform.tfstate" \
  --dest-backend "dest-bucket/terraform.tfstate" \
  --dest-type s3
```

### S3 to Local
```bash
./migrate-backend.sh \
  --source-backend "s3-bucket/terraform.tfstate" \
  --dest-backend "../local.tfstate" \
  --dest-type local
```

## Validation Checklist

After migration, the validator checks:

1. **State Access**: Can Terraform read the new state?
2. **Terraform Plan**: Does the plan show expected results?
3. **Resource Import**: Are all resources present in the new state?
4. **Drift Check**: Are there unexpected resource changes?
5. **State Lock**: Is the lock mechanism functional?

## Rollback

If migration fails or validation detects issues:

```bash
# Automatic rollback (triggered by migration script)
# Or manual rollback
terraform state push infrastructure/ci/backups/state-backup-<timestamp>.tfstate
```

## Best Practices

1. Always run with `--dry-run` first
2. Ensure no concurrent Terraform operations during migration
3. Review the validation report carefully
4. Test with a non-critical environment first
5. Keep backups for at least 30 days
6. Notify the team before and after migration
