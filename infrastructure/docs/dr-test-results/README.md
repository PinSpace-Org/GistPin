# DR Test Results

## Overview

This directory contains disaster recovery test results, procedures, and interpretation guides for GistPin's cross-region DR setup. Tests are executed monthly via the `monthly-dr-test.yml` GitHub Actions workflow.

## DR Architecture

| Parameter | Target | Description |
|-----------|--------|-------------|
| **RTO** | 15 minutes (900s) | Maximum acceptable time to restore service after primary failure |
| **RPO** | 5 minutes (300s) | Maximum acceptable data loss measured in time |
| **Primary region** | us-east-1 | Active production workload region |
| **DR region** | us-west-2 | Standby region with pre-provisioned infrastructure |

## Test Procedure

The automated DR test (`dr-test-runner.sh`) executes four phases:

### Phase 1: Primary Region Failure Simulation
- Blocks traffic to primary region endpoints
- Confirms primary region is no longer reachable
- Records the start timestamp for RTO measurement

### Phase 2: Failover Time Measurement (RTO)
- Initiates failover to DR region by scaling up workloads
- Polls DR region health endpoint until it becomes available
- Measures wall-clock time from failure simulation to DR readiness
- Threshold: **must complete within 900 seconds**

### Phase 3: Data Completeness Verification (RPO)
- Checks RDS cross-region replication lag via CloudWatch metrics
- Verifies S3 cross-region replication by writing and confirming a probe object
- Confirms database backup freshness in DR bucket
- Threshold: **replication lag must be under 300 seconds**

### Phase 4: DR Workload Health Check
- Verifies Kubernetes pods are running in DR cluster
- Confirms backend service availability
- Validates that at least 2 pods are in Running state

## Interpreting Results

### Pass/Fail Criteria

| Check | Pass Condition | Fail Meaning |
|-------|---------------|--------------|
| Failover time | ≤ 900s | DR infrastructure may be under-provisioned or scaling is too slow |
| RDS replication lag | ≤ 300s | Cross-region replication may be degraded or broken |
| S3 replication | Probe file replicated | S3 replication rule may be misconfigured |
| Backup freshness | Backup file exists | Backup job may have failed |
| Pod readiness | ≥ 2 pods running | DR cluster or deployment may be misconfigured |

### Result Storage

Test results are archived as GitHub Actions artifacts with 365-day retention. Each result file follows the naming pattern:

```
dr-test-runner-YYYYMMDD-HHMMSS.txt
```

## Running Tests Manually

### Via GitHub Actions

```bash
gh workflow run monthly-dr-test.yml \
  -f primary_region=us-east-1 \
  -f dr_region=us-west-2
```

### Via CLI

```bash
PRIMARY_REGION=us-east-1 DR_REGION=us-west-2 \
  bash infrastructure/scripts/dr-test-runner.sh
```

## Required Permissions

The DR test script requires the following AWS permissions:

- `eks:DescribeCluster` — for DR EKS cluster status
- `cloudwatch:GetMetricStatistics` — for RDS replication lag
- `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` — for S3 replication checks
- `sts:GetCallerIdentity` — for account context resolution

These are granted via the IAM role specified in `AWS_DR_TEST_ROLE_ARN`.
