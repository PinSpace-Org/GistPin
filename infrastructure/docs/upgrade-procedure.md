# Kubernetes Node Group Upgrade Procedure

This document outlines the procedure for safely upgrading Kubernetes versions on EKS node groups in the GistPin infrastructure.

## Overview

The upgrade process automates the safe rolling upgrade of Kubernetes node groups with the following features:
- Comprehensive pre-upgrade validation checks
- Cordoning and draining of nodes before termination
- Gradual rolling replacement of nodes
- Post-upgrade validation
- Automated rollback capability

## Prerequisites

Before running any upgrade, ensure you have:

1. **Required tools installed**:
   - AWS CLI (configured with appropriate permissions)
   - kubectl (configured to access your cluster)
   - jq (for JSON processing)

2. **AWS permissions required**:
   - `eks:DescribeCluster`
   - `eks:DescribeNodegroup`
   - `eks:UpdateNodegroupVersion`
   - `ec2:DescribeSubnets`
   - Permissions to update kubeconfig

3. **Cluster readiness**:
   - The cluster control plane must already be upgraded to the target Kubernetes version
   - You can only upgrade one minor version at a time (e.g., 1.27 → 1.28 is supported, 1.27 → 1.29 is not)
   - The node group must have enough capacity to add new nodes during the rolling upgrade (max size > current desired size)

## Pre-Upgrade Checks

The `pre-upgrade-checks.sh` script automatically verifies all prerequisites before an upgrade can begin:

```bash
./infrastructure/scripts/pre-upgrade-checks.sh <cluster-name> <node-group-name> <target-version>
```

### Checks Performed

1. **Dependency validation**: Verifies AWS CLI, kubectl, and jq are installed
2. **Cluster existence**: Confirms the specified EKS cluster exists and is accessible
3. **Node group eligibility**:
   - Verifies the node group exists
   - Checks that the target version is different from current version
   - Validates only one minor version upgrade is attempted
   - Confirms target version matches cluster control plane version
4. **Resource capacity**: Ensures node group has enough max capacity to add new nodes
5. **Cluster health**:
   - All nodes are in Ready state
   - No problematic PodDisruptionBudgets that would block draining
   - All kube-system pods are running
6. **Subnet capacity**: Verifies sufficient IP addresses are available in subnets
7. **Node group status**: Confirms the node group is in ACTIVE state with no ongoing operations

## Running the Upgrade

### Standard Upgrade Process

To perform a rolling upgrade of a node group:

```bash
./infrastructure/scripts/upgrade-node-group.sh <cluster-name> <node-group-name> <target-version>
```

### What Happens During Upgrade

1. **Pre-flight**: Runs all pre-upgrade checks to ensure eligibility
2. **Initiate EKS upgrade**: Triggers the AWS EKS node group version update
3. **Wait for new nodes**: Waits for EKS to provision new nodes with the target version
4. **Process old nodes sequentially**:
   - **Cordon**: Marks the node as unschedulable to prevent new pods from being assigned
   - **Drain**: Evicts all existing pods from the node (respects PodDisruptionBudgets)
   - Waits for workloads to reschedule onto new nodes
5. **Post-upgrade validation**: After all nodes are replaced, verifies:
   - All nodes are running the target Kubernetes version
   - All nodes are in Ready state
   - All pods are running correctly
   - The node group is back to ACTIVE state

## Rollback Procedure

If an upgrade fails or issues are discovered after upgrade, you can rollback to the previous version:

```bash
./infrastructure/scripts/upgrade-node-group.sh <cluster-name> <node-group-name> <original-version> --rollback
```

### Rollback Process

1. The rollback script retrieves the node group details
2. Initiates an EKS node group version update back to the original version
3. Waits for the rollback operation to complete
4. Verifies all nodes are running the original version
5. Performs health checks to ensure cluster stability after rollback

## Best Practices

1. **Test first**: Always test the upgrade procedure in a staging environment first
2. **Schedule during low traffic**: Run upgrades during periods of lower application traffic
3. **Monitor closely**: Keep an eye on cluster metrics, application logs, and node health during the upgrade
4. **Backup critical data**: Ensure all persistent volumes have recent backups before performing infrastructure changes
5. **Upgrade sequentially**: If upgrading multiple node groups, upgrade them one at a time to maintain capacity
6. **Verify workload resiliency**: Ensure your applications are designed to tolerate node failures and rescheduling

## Troubleshooting

### Common Issues

1. **Node draining fails**: This is often due to PodDisruptionBudgets that block evictions. Check the pre-upgrade warnings for PDBs with 0 disruptions allowed.
2. **New nodes fail to join**: Check subnet IP capacity, security group configurations, and AWS service limits.
3. **Upgrade times out**: The script has built-in timeouts. If this happens frequently, you may need to adjust timings for larger clusters.
4. **Workload issues after upgrade**: Check application logs for compatibility issues with the new Kubernetes version. Roll back immediately if critical issues are found.

## Emergency Contact

In case of issues during upgrade that require immediate assistance, follow the emergency procedures outlined in [emergency-procedures.md](runbooks/emergency-procedures.md).