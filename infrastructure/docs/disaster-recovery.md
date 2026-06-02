# Disaster Recovery

## Overview

GistPin uses an active-passive DR setup across two AWS regions.

| Parameter | Target |
|-----------|--------|
| RTO | 30 minutes |
| RPO | 5 minutes |
| Primary region | us-east-1 |
| DR region | us-west-2 |

## Architecture

- **Database**: RDS PostgreSQL with cross-region read replica in us-west-2
- **Storage**: S3 with cross-region replication enabled
- **Compute**: EKS cluster pre-provisioned in DR region (scaled to 0 at rest)
- **DNS**: Route53 health-check-based failover

## Runbooks

### Triggering Failover

```bash
# Dry-run first
DRY_RUN=true ./infrastructure/scripts/failover.sh

# Execute failover
DRY_RUN=false PRIMARY_REGION=us-east-1 DR_REGION=us-west-2 \
  ./infrastructure/scripts/failover.sh
```

The script handles: RDS replica promotion → DNS update → workload scale-up → health verification.

### Testing DR Readiness

Run monthly or after infrastructure changes:

```bash
DR_REGION=us-west-2 ./infrastructure/scripts/dr-test.sh
```

Tests: EKS reachability, RDS replication lag, S3 replication, pod readiness, backup availability.

### Failback to Primary

Once primary region is restored:

1. Sync any data written to DR back to primary RDS
2. Re-establish RDS replication (primary → DR)
3. Update Route53 to point back to primary
4. Scale down DR workloads

```bash
DRY_RUN=false PRIMARY_REGION=us-west-2 DR_REGION=us-east-1 \
  ./infrastructure/scripts/failover.sh
```

## Monitoring

- RDS `ReplicaLag` CloudWatch metric — alert if > 60s
- S3 replication metrics in CloudWatch
- DR test results stored in `/tmp/dr-test-*.txt` and uploaded to S3

## Contacts

| Role | Responsibility |
|------|---------------|
| On-call engineer | Execute failover, monitor RTO |
| DB admin | Validate RDS promotion |
| Platform lead | Approve failback |
