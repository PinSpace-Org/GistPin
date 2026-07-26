# Kubernetes Cluster Upgrade Runbook

## Overview

Semi-automated EKS cluster upgrade using `scripts/upgrade-cluster.sh`.

## Prerequisites

- `aws` CLI configured with cluster admin permissions
- `kubectl` context pointing to the target cluster
- All workloads healthy before starting

## Procedure

### 1. Pre-upgrade checks

```bash
bash infrastructure/scripts/validate-upgrade.sh \
  --current 1.29 --target 1.30
```

Verify:
- All nodes in `Ready` state
- No pods in `CrashLoopBackOff` or `Pending`
- No deprecated APIs in use (run `pluto detect-all-in-cluster`)

### 2. Run upgrade (dry run first)

```bash
CLUSTER_NAME=gistpin-cluster \
bash infrastructure/scripts/upgrade-cluster.sh \
  --target-version 1.30 --dry-run
```

Then for real:

```bash
CLUSTER_NAME=gistpin-cluster \
bash infrastructure/scripts/upgrade-cluster.sh \
  --target-version 1.30
```

### 3. Post-upgrade validation

The script runs `validate-upgrade.sh` automatically after each step.
Additionally verify:

```bash
kubectl get nodes -o wide
kubectl get pods -A | grep -v Running | grep -v Completed
```

### 4. Rollback

EKS does not support in-place downgrade. To roll back:
1. Restore node groups from a pre-upgrade launch template snapshot
2. Cordon upgraded nodes and uncordon old nodes
3. Contact AWS Support for control plane rollback if needed

## Upgrade cadence

| Environment | Policy |
|---|---|
| dev | Upgrade within 2 weeks of GA |
| staging | Upgrade within 4 weeks of dev validation |
| prod | Upgrade within 8 weeks of staging validation |
