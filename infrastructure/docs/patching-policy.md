# Patching Policy

## Scope

This policy covers OS patches for EKS nodes, container base image updates, and RDS engine upgrades for all GistPin environments.

## Patch Schedule

| Environment | Schedule | Window |
|-------------|----------|--------|
| Staging | Every Tuesday 02:00 UTC | 2 hours |
| Production | Every 3rd Sunday 03:00 UTC | 4 hours |

Critical security patches (CVSS ≥ 9.0) are applied within 24 hours in all environments.

## Severity SLAs

| Severity | SLA |
|----------|-----|
| Critical (CVSS ≥ 9.0) | 24 hours |
| High (CVSS 7.0–8.9) | 7 days |
| Medium (CVSS 4.0–6.9) | 30 days |
| Low (CVSS < 4.0) | Next scheduled window |

## Process

### 1. Assessment
```bash
ENVIRONMENT=staging ./infrastructure/scripts/assess-patches.sh
```
Review the report for missing patches and CVEs before proceeding.

### 2. Staged Rollout
Patches are applied one node at a time. Each node is cordoned, drained, patched via AWS SSM, then uncordoned before moving to the next.

```bash
# Staging
DRY_RUN=false ENVIRONMENT=staging ./infrastructure/scripts/patch-system.sh

# Production (after staging validation)
DRY_RUN=false ENVIRONMENT=production ./infrastructure/scripts/patch-system.sh
```

### 3. Rollback
A pre-patch RDS snapshot is created automatically. To roll back:
```bash
# Restore RDS from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier gistpin-db-restored \
  --db-snapshot-identifier <snapshot-id>

# Roll back EKS nodes via node group update
aws eks update-nodegroup-version --cluster-name gistpin \
  --nodegroup-name gistpin-nodes --launch-template version=<previous>
```

## Compliance Tracking

Patch compliance is reported via AWS SSM Patch Manager. Targets:
- **Compliance rate**: ≥ 98% of nodes patched within SLA
- **Critical patch lag**: 0 nodes with unpatched critical CVEs > 24h

Reports are generated automatically after each patch run and stored in S3 at `s3://gistpin-compliance/patches/`.
