# Terraform State Migration

## Overview

This document describes the tooling and procedures for migrating Terraform state between backends, environments, or configurations.

## Tools

| Script | Purpose |
|--------|---------|
| `infrastructure/scripts/migrate-state.sh` | State migration, backup, rollback, import, move |
| `infrastructure/scripts/validate-state.sh` | State validation and health check |

## Migration Procedures

### Standard Migration

```bash
# 1. Backup current state
bash infrastructure/scripts/migrate-state.sh backup

# 2. Validate configuration
bash infrastructure/scripts/migrate-state.sh validate

# 3. Migrate to new backend
bash infrastructure/scripts/migrate-state.sh migrate path/to/new-backend-config.tf
```

### Rollback

```bash
bash infrastructure/scripts/migrate-state.sh rollback
```

### Resource Import

```bash
bash infrastructure/scripts/migrate-state.sh import aws_s3_bucket.my_bucket my-bucket-name
```

### Resource Move

```bash
bash infrastructure/scripts/migrate-state.sh mv aws_s3_bucket.old aws_s3_bucket.new
```

## Best Practices

1. Always create a backup before any state operation
2. Validate state after migration with `validate-state.sh`
3. Keep at least 30 days of state backups
4. Use state locking (DynamoDB + S3 backend)
5. Never manually edit `.tfstate` files
