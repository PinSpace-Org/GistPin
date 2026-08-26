# EKS Resource Lifecycle

This document describes the create, update, and delete behavior for Amazon EKS clusters and node groups managed by Terraform in the GistPin infrastructure.

## Overview

| Aspect | Details |
|--------|---------|
| Resource Types | `aws_eks_cluster`, `aws_eks_node_group`, `aws_eks_addon` |
| Terraform Module | `terraform/eks.tf` |
| Kubernetes Version | 1.29 |
| Node AMI | Amazon Linux 2 (AL2023 for new node groups) |

## Create Behavior

### Cluster Provisioning

| Step | Duration | Can Fail? |
|------|----------|-----------|
| IAM role creation | < 1 minute | Yes (permissions) |
| EKS control plane | 10-15 minutes | Yes (service limits) |
| VPC CNI plugin | 2-5 minutes | Yes (network config) |
| CoreDNS addon | 3-5 minutes | Yes (dependency) |
| Node group | 10-20 minutes | Yes (instance limits) |
| Pod readiness | 5-10 minutes | Yes (image pull, resources) |

**Total estimated time**: 30-55 minutes for full cluster readiness.

### Cluster Creation

```hcl
resource "aws_eks_cluster" "main" {
  name     = "gistpin-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = var.private_subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = false
    security_group_ids      = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = [
    "api", "audit", "authenticator", "controllerManager", "scheduler",
  ]

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}
```

### Node Group Creation

```hcl
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "gistpin-${var.environment}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = var.private_subnet_ids
  instance_types  = ["m6i.xlarge"]

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }

  update_config {
    max_unavailable_percentage = 25
  }

  labels = {
    role = "general"
  }

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Environment = var.environment
  }

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}
```

### Post-Creation Verification

```bash
# Verify cluster is active
aws eks describe-cluster --name gistpin-${ENV} --query 'cluster.status'

# Confirm nodes are ready
kubectl get nodes --context gistpin-${ENV}

# Verify system pods
kubectl get pods -n kube-system --context gistpin-${ENV}

# Check addon versions
aws eks describe-addon --cluster-name gistpin-${ENV} --addon-name vpc-cni
```

## Update Behavior

### Kubernetes Version Upgrades

| Upgrade Type | Downtime | Rollout Time |
|--------------|----------|--------------|
| Minor version (1.28 → 1.29) | None (control plane) | 15-30 minutes |
| Patch version (1.29.1 → 1.29.2) | None | 5-10 minutes |

**Upgrade process:**

1. Update `version` in Terraform
2. Run `terraform plan` — only the control plane is modified
3. Apply changes — AWS manages the control plane upgrade
4. Update node group AMI version separately
5. Nodes are drained and replaced one at a time

```bash
# Step 1: Upgrade control plane
terraform apply -var="kubernetes_version=1.29"

# Step 2: Update node group AMI
aws eks update-nodegroup-version \
  --cluster-name gistpin-${ENV} \
  --nodegroup-name gistpin-${ENV}-nodes

# Step 3: Monitor rollout
kubectl rollout status daemonset/aws-node -n kube-system
```

### Node Group Updates

| Update Type | Behavior | Downtime |
|-------------|----------|----------|
| Instance type change | New nodes launched, old drained | None (if sufficient capacity) |
| Scaling config | Desired size adjusted immediately | None |
| Labels/taints | Updated on existing nodes | None |
| AMI version | Rolling update with drain | None (if PodDisruptionBudgets set) |

**Rolling update behavior:**

- `max_unavailable_percentage = 25` means up to 25% of nodes are replaced simultaneously
- Pods are drained respecting PodDisruptionBudgets
- New nodes launch from latest AMI
- Old nodes are cordoned and drained

### Addon Updates

| Addon | Update Method | Impact |
|-------|--------------|--------|
| vpc-cni | Rolling update | None |
| coredns | Rolling update | Brief DNS disruption (seconds) |
| kube-proxy | In-place update | None |
| ebs-csi-driver | Rolling update | None (if volumes not mounting) |

```bash
# Update a specific addon
aws eks update-addon \
  --cluster-name gistpin-${ENV} \
  --addon-name vpc-cni \
  --resolve-conflicts PRESERVE
```

### Terraform State Modifications

| Change | Requires Replacement? |
|--------|----------------------|
| `name` | Yes (cluster recreation) |
| `version` | No (in-place upgrade) |
| `vpc_config` | No (in-place update) |
| `encryption_config` | Yes (force new) |
| Node `instance_types` | No (rolling replacement) |
| Node `scaling_config` | No (immediate) |

## Delete Behavior

### Deletion Order

> **WARNING**: EKS cluster deletion is destructive and irreversible. All workloads, PVCs, and cluster state will be lost.

```
1. Remove all workloads (kubectl delete namespace)
2. Delete Helm releases
3. Remove Ingress/load balancer resources
4. Delete PVCs and verify data backup
5. Remove EKS addons (vpc-cni, coredns, kube-proxy)
6. Delete node groups
7. Delete EKS cluster
8. Remove IAM roles and policies
9. Clean up security groups
10. Remove from Terraform state
```

### Estimated Deletion Time

| Resource | Time |
|----------|------|
| Node group | 10-15 minutes |
| EKS cluster | 15-25 minutes |
| IAM roles | < 1 minute |
| Security groups | < 1 minute |

### State Retention

| Resource | Retained After Delete? |
|----------|----------------------|
| EKS cluster | No |
| Node instances | No |
| EBS volumes | Yes (if `retain` set) |
| S3 data | Yes |
| RDS data | Yes (separate resource) |
| CloudWatch logs | Yes (retention policy) |

### Destruction Checklist

- [ ] Scale node group to minimum: `desired_size = 2`
- [ ] Drain all non-system workloads
- [ ] Backup all PVC data to S3
- [ ] Remove Helm releases: `helm list --all-namespaces`
- [ ] Delete Ingress resources: `kubectl get ingress --all-namespaces`
- [ ] Remove external DNS records pointing to cluster
- [ ] Notify dependent teams
- [ ] Disable cluster autoscaler
- [ ] Set `deletion_protection = false` if enabled
- [ ] Apply Terraform destroy in order: addons → node groups → cluster

## Known Issues and Workarounds

### 1. Node Group Stuck in DELETING State

**Symptom**: `terraform destroy` hangs for 20+ minutes on node group.

**Cause**: Pods not gracefully terminating, or PDB preventing drain.

**Workaround**:
```bash
# Force delete stuck nodes
kubectl delete node <node-name> --grace-period=0 --force

# Then retry
terraform destroy -target=aws_eks_node_group.main
```

### 2. ENI Leak After Node Termination

**Symptom**: VPC shows orphaned ENIs after node group scaling down.

**Cause**: VPC CNI plugin not releasing ENIs before node termination.

**Workaround**: Enable `AWS_VPC_K8S_CNI_LOGLEVEL=DEBUG` and check for warm ENI pool settings. Clean up manually if needed:
```bash
aws ec2 describe-network-interfaces \
  --filters "Name=tag:aws:eks:cluster-name,Values=gistpin-${ENV}" \
  --query 'NetworkInterfaces[?Status==`available`].NetworkInterfaceId'
```

### 3. Cluster Endpoint Unreachable After Private Update

**Symptom**: Cannot connect to cluster API after disabling public endpoint.

**Cause**: Bastion host or CI/CD pipeline not in VPC or lacking security group access.

**Workaround**: Ensure VPN or bastion host has:
- Network access to cluster endpoint security group (port 443)
- `aws-auth` ConfigMap entry for the IAM role
- Proper kubeconfig with correct CA bundle

### 4. Addon Version Conflict

**Symptom**: `terraform plan` shows addon version changes every apply.

**Cause**: AWS auto-updates addon versions and Terraform doesn't pin them.

**Workaround**: Set explicit `addon_version` in Terraform:
```hcl
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  addon_version = "v1.15.1-eksbuild.1"
  resolve_conflicts = "PRESERVE"
}
```

### 5. Pod Identity vs IRSA Confusion

**Symptom**: Workloads cannot assume IAM roles via service accounts.

**Cause**: Mix of Pod Identity and IRSA (IAM Roles for Service Accounts) configurations.

**Workaround**: Standardize on Pod Identity for new clusters. For existing IRSA workloads, ensure `eks.amazonaws.com/role-arn` annotation is set and the OIDC provider is registered.

## Dependency Ordering

```
aws_iam_role.eks_cluster        (independent)
aws_iam_role.eks_nodes          (independent)
aws_security_group.eks_cluster  (depends on VPC)
aws_kms_key.eks                 (independent)
aws_eks_cluster.main            (depends on iam_role, security_group, kms_key)
aws_eks_addon.vpc_cni           (depends on aws_eks_cluster.main)
aws_eks_addon.coredns           (depends on aws_eks_addon.vpc_cni)
aws_eks_addon.kube_proxy        (depends on aws_eks_cluster.main)
aws_eks_node_group.main         (depends on aws_eks_cluster.main, aws_iam_role.eks_nodes)
aws_eks_access_entry            (depends on aws_eks_cluster.main)
```

## Migration Notes

- **Cluster version upgrades**: Always upgrade one minor version at a time. AWS does not support skipping versions (e.g., 1.27 → 1.29).
- **Node AMI migration**: AL2 → AL2023 requires node group replacement, not in-place update.
- **Networking plugin migration**: Switching from kubenet to VPC CNI requires cluster recreation.
- **Multi-cluster migration**: Use `kubectl cluster-info` and etcd backup/restore for state migration between clusters.
- **Cost optimization**: Use Karpenter instead of managed node groups for better bin-packing and faster provisioning.
