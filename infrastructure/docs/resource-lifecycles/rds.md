# RDS Resource Lifecycle

This document describes the create, update, and delete behavior for Amazon RDS instances managed by Terraform in the GistPin infrastructure.

## Overview

| Aspect | Details |
|--------|---------|
| Resource Type | `aws_db_instance` |
| Terraform Module | `terraform/rds.tf` |
| Engine | PostgreSQL 15 |
| Backup Retention | 30 days |
| Deletion Protection | Enabled in prod/staging |

## Create Behavior

### What Happens

1. **Subnet group** is created (or validated if pre-existing)
2. **Parameter group** is applied with custom PostgreSQL settings
3. **DB instance** is provisioned (takes 10-20 minutes for `db.r6g.large`)
4. **Initial snapshot** is created automatically
5. **DNS endpoint** becomes available once instance status is `available`

### Provisioning Time

| Instance Class | Expected Time |
|----------------|---------------|
| `db.t3.medium` | 5-8 minutes |
| `db.r6g.large` | 10-20 minutes |
| `db.r6g.xlarge` | 15-25 minutes |
| `db.r6g.2xlarge` | 20-35 minutes |

### Initial Configuration

```hcl
resource "aws_db_instance" "primary" {
  identifier     = "gistpin-primary"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "gistpin"
  username = var.db_username
  password = var.db_password

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.primary.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "gistpin-primary-final"
  copy_tags_to_snapshot     = true

  performance_insights_enabled = true

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}
```

### Post-Creation Steps

- Verify endpoint is resolvable from within VPC
- Confirm application can connect using new credentials
- Validate parameter group settings are applied: `SHOW ALL;`
- Check CloudWatch metrics are flowing

## Update Behavior

### In-Place Updates (No Downtime)

| Parameter Change | Behavior | Downtime |
|------------------|----------|----------|
| `allocated_storage` | Auto-expand only (no shrink) | None |
| `max_allocated_storage` | Applied immediately | None |
| `parameter_group_name` | Some params require reboot | None if no reboot params |
| `tags` | Applied immediately | None |
| `monitoring_interval` | Applied immediately | None |
| `performance_insights_enabled` | Applied immediately | None |

### Updates Requiring Reboot

| Parameter Change | Behavior | Downtime |
|------------------|----------|----------|
| `instance_class` | Reboot required | 1-3 minutes |
| `engine_version` | Minor version upgrade, brief reboot | 1-5 minutes |
| `parameter_group_name` | If reboot params differ | 1-3 minutes |

To apply a reboot-requiring change:

```bash
# Check if reboot is pending
terraform plan -target=aws_db_instance.primary

# Apply changes
terraform apply -target=aws_db_instance.primary

# Force reboot if needed
aws rds reboot-db-instance \
  --db-instance-identifier gistpin-primary \
  --force-failover
```

### Storage Resizing

- **Growing**: Handled automatically. GP3 storage expands up to `max_allocated_storage` with no downtime.
- **Shrinking**: Not supported by AWS. Must create a new instance from snapshot and migrate.
- **Type change** (gp2 → gp3): Requires downtime. Supported via Terraform `storage_type` change.

### Major Version Upgrades

1. Create a manual snapshot before proceeding
2. Update `engine_version` in Terraform
3. Run `terraform plan` to verify upgrade path
4. Apply changes — AWS handles the upgrade
5. Monitor replication lag if using read replicas
6. Validate application compatibility post-upgrade

```bash
# Pre-upgrade snapshot
aws rds create-db-snapshot \
  --db-instance-identifier gistpin-primary \
  --db-snapshot-identifier pre-upgrade-$(date +%Y%m%d)

# Apply upgrade
terraform apply -var="engine_version=16.1"
```

## Delete Behavior

### Deletion Protection

| Environment | `deletion_protection` | `skip_final_snapshot` |
|-------------|----------------------|----------------------|
| prod | `true` | `false` |
| staging | `true` | `false` |
| dev | `false` | `true` |

### Deletion Process

1. **Terraform destroy** is blocked if `deletion_protection = true`
2. Must first disable deletion protection in Terraform and apply
3. Then run `terraform destroy` or remove from state
4. A final snapshot is taken (unless `skip_final_snapshot = true`)
5. Instance enters `deleting` state (takes 5-10 minutes)
6. Automated backups are retained for `backup_retention_period` days

### Recovery Window

| Backup Type | Retention | Recovery Point |
|-------------|-----------|----------------|
| Automated daily | 30 days | Any point within 30 days |
| Transaction logs | 30 days | Point-in-time to the second |
| Final snapshot | Until manually deleted | At time of deletion |
| Manual snapshots | Until manually deleted | At time of creation |

### Destruction Checklist

> **WARNING**: Deleting the primary RDS instance will cause data loss for all connected applications.

- [ ] Verify no active connections: `SELECT * FROM pg_stat_activity;`
- [ ] Confirm final snapshot is created
- [ ] Notify team and schedule maintenance window
- [ ] Update DNS records to remove endpoint
- [ ] Remove any read replicas first
- [ ] Disable deletion protection: `deletion_protection = false`
- [ ] Apply Terraform change
- [ ] Run `terraform destroy -target=aws_db_instance.primary`
- [ ] Verify instance status shows `deleted`
- [ ] Confirm final snapshot exists in AWS Console

## Known Issues and Workarounds

### 1. Terraform State Drift on Storage

**Symptom**: `terraform plan` shows storage changes not made in code.

**Cause**: AWS auto-scales GP3 storage when usage exceeds threshold.

**Workaround**: Add `lifecycle { ignore_changes = [allocated_storage] }` if auto-scaling is desired, or set `max_allocated_storage` to cap expansion.

### 2. Parameter Group Apply Immediately

**Symptom**: Changes to parameter group apply during next maintenance window, not immediately.

**Workaround**: Set `apply_method = "immediate"` on parameters that need instant effect, or reboot the instance after applying.

### 3. Read Replica Lag

**Symptom**: Read replicas fall behind primary during high write load.

**Workaround**: Monitor `ReplicaLag` CloudWatch metric. Scale up replica instance class if lag exceeds SLA. Consider using `async_commit` for less critical reads.

### 4. Password Rotation Without Downtime

**Symptom**: Changing `password` in Terraform triggers instance replacement.

**Workaround**: Use AWS Secrets Manager rotation instead. Reference the secret ARN rather than a plain-text password in Terraform.

## Dependency Ordering

```
aws_db_subnet_group          (independent)
aws_db_parameter_group       (independent)
aws_security_group.rds       (depends on VPC)
aws_db_instance.primary      (depends on subnet_group, parameter_group, security_group)
aws_db_instance.read_replica (depends on aws_db_instance.primary)
aws_db_instance_automated_backups_replication (depends on aws_db_instance.primary)
```

## Migration Notes

- **Engine upgrades**: Always test in staging first. Major version upgrades are irreversible without restoring from backup.
- **Instance class changes**: Requires downtime window. Multi-AZ failover minimizes impact.
- **Cross-region read replica**: Use `aws_db_instance` with `replicate_source_db` for DR setup.
- **Snapshot restore**: Creates a new instance. Update Terraform state to manage the restored instance.
