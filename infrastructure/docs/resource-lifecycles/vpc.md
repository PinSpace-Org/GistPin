# VPC Resource Lifecycle

This document describes the create, update, and delete behavior for Amazon VPC resources managed by Terraform in the GistPin infrastructure.

## Overview

| Aspect | Details |
|--------|---------|
| Resource Types | `aws_vpc`, `aws_subnet`, `aws_route_table`, `aws_nat_gateway`, `aws_internet_gateway` |
| Terraform Module | `terraform/vpc.tf` |
| CIDR Block | `10.0.0.0/16` |
| AZs Used | 3 (us-east-1a, us-east-1b, us-east-1c) |
| NAT Gateway Count | 1 (shared) or 3 (per-AZ) |

## Network Topology

```
10.0.0.0/16 (VPC)
├── 10.0.0.0/20   — Public Subnets    (us-east-1a/b/c)
├── 10.0.64.0/18  — Private Subnets   (us-east-1a/b/c)
├── 10.0.128.0/18 — Database Subnets  (us-east-1a/b/c)
└── 10.0.192.0/18 — Reserved
```

## Create Behavior

### Provisioning Time

| Resource | Expected Time | Notes |
|----------|---------------|-------|
| VPC | 1-2 minutes | Fast, foundational |
| Internet Gateway | < 1 minute | Attaches to VPC |
| Subnets (6) | < 1 minute each | Created in parallel |
| Route tables | < 1 minute | Association takes effect immediately |
| NAT Gateway | 3-5 minutes | Allocates Elastic IP |
| VPC Endpoints | 2-5 minutes | Depends on service |
| NACLs | < 1 minute | Applied immediately |

**Total VPC setup time**: 5-10 minutes (without NAT) or 8-15 minutes (with NAT).

### Core VPC Configuration

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "gistpin-${var.environment}"
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Environment = var.environment
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  for_each = {
    "us-east-1a" = { cidr = "10.0.0.0/20", az = "us-east-1a" }
    "us-east-1b" = { cidr = "10.0.16.0/20", az = "us-east-1b" }
    "us-east-1c" = { cidr = "10.0.32.0/20", az = "us-east-1c" }
  }

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = {
    Name                     = "gistpin-public-${each.key}"
    "kubernetes.io/role/elb" = "1"
    Environment              = var.environment
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  for_each = {
    "us-east-1a" = { cidr = "10.0.64.0/18", az = "us-east-1a" }
    "us-east-1b" = { cidr = "10.0.128.0/18", az = "us-east-1b" }
    "us-east-1c" = { cidr = "10.0.192.0/18", az = "us-east-1c" }
  }

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name                              = "gistpin-private-${each.key}"
    "kubernetes.io/role/internal-elb" = "1"
    Environment                       = var.environment
  }
}
```

### Route Configuration

```
Public Route Table:
  0.0.0.0/0  → igw-xxxx (Internet Gateway)
  local      → local

Private Route Table:
  0.0.0.0/0  → nat-xxxx (NAT Gateway)
  local      → local

Database Route Table:
  local      → local (no internet access)
```

## Update Behavior

### In-Place Updates (No Downtime)

| Change | Behavior | Impact |
|--------|----------|--------|
| Subnet CIDR resize | Cannot be changed (requires replacement) | N/A |
| Route table entries | Updated immediately | Brief route convergence |
| NACL rules | Applied immediately | None |
| Security group rules | Applied immediately (with connection tracking) | None |
| Tags | Applied immediately | None |
| DNS settings | Applied immediately | None |

### Updates Requiring Replacement

| Change | Impact | Recovery |
|--------|--------|----------|
| VPC CIDR block | Full replacement — all resources must be recreated | Plan major migration window |
| Subnet AZ | Subnet destroyed and recreated | All AZ-dependent resources failover |
| Availability Zone count | New subnets created, existing untouched | None |

### NAT Gateway Updates

| Change | Behavior | Downtime |
|--------|----------|----------|
| NAT Gateway instance type | New gateway created, routes updated | 2-5 minutes |
| Elastic IP reassignment | Routes updated to new EIP | 1-3 minutes |
| New AZ added | New NAT gateway provisioned | None (if using per-AZ) |

### VPC Endpoint Management

| Endpoint Type | Update Behavior | Impact |
|---------------|----------------|--------|
| Gateway (S3, DynamoDB) | Route table updated | None |
| Interface (other services) | ENIs created/removed | None |
| Security group update | Applied immediately | None |

```hcl
# VPC Endpoint for S3 (Gateway type)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]
}

# VPC Endpoint for ECR (Interface type)
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = [for s in aws_subnet.private : s.id]
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}
```

## Delete Behavior

### Deletion Order

> **WARNING**: VPC deletion cascades to all dependent resources. Every resource in the VPC must be removed first.

```
1. Delete all workloads (EKS nodes, EC2 instances)
2. Delete load balancers and target groups
3. Delete RDS instances and subnet groups
4. Delete ElastiCache clusters
5. Delete ECR repositories (if in VPC)
6. Delete VPC endpoints
7. Delete NAT Gateways (release Elastic IPs)
8. Delete Internet Gateway
9. Delete subnets
10. Delete route tables
11. Delete NACLs
12. Delete VPC
```

### Estimated Deletion Time

| Resource | Time | Can Fail? |
|----------|------|-----------|
| NAT Gateway | 3-5 minutes | Yes (dependent resources) |
| VPC Endpoints | 2-5 minutes | Yes (ENI cleanup) |
| Load Balancers | 5-10 minutes | Yes (target group cleanup) |
| Subnets | 1-2 minutes each | Yes (orphaned ENIs) |
| VPC | 1-3 minutes | Yes (final dependencies) |

### Cascading Deletions

Deleting the VPC will automatically affect:

| Resource | Effect |
|----------|--------|
| EC2 instances | Terminated |
| RDS instances | Terminated (unless `deletion_protection`) |
| EKS clusters | Deleted |
| NAT Gateways | Deleted |
| Load Balancers | Deleted |
| VPC Peering connections | Terminated |
| Route 53 resolver endpoints | Deleted |
| VPN connections | Terminated |

### State Retention

| Resource | Retained After Delete? |
|----------|----------------------|
| VPC flow logs | Yes (CloudWatch/S3) |
| Elastic IPs | Yes (if released to pool) |
| EBS volumes | Only if detached before deletion |
| Snapshots | Yes |
| S3 data | Yes (separate resource) |
| Route 53 records | Yes (separate resource) |

### Destruction Checklist

- [ ] Scale EKS node groups to zero
- [ ] Delete all persistent volumes: `kubectl get pvc --all-namespaces`
- [ ] Backup PVC data to S3
- [ ] Remove all Ingress and LoadBalancer services
- [ ] Delete RDS instances (verify final snapshot)
- [ ] Remove all Elastic Load Balancers
- [ ] Delete ElastiCache clusters
- [ ] Remove VPC peering connections
- [ ] Clean up Route 53 records pointing to VPC resources
- [ ] Verify no resources remain: `aws ec2 describe-network-interfaces --filters "Name=vpc-id,Values=vpc-xxx"`
- [ ] Disable deletion protection on all resources
- [ ] Apply Terraform destroy in dependency order

## Known Issues and Workarounds

### 1. VPC Cannot Be Deleted — Dependency Still Exists

**Symptom**: `VPC vpc-xxx has some dependencies that cannot be deleted` error.

**Cause**: Orphaned ENIs, ELBs, or NAT gateways still referencing the VPC.

**Workaround**:
```bash
# Find all ENIs in the VPC
aws ec2 describe-network-interfaces \
  --filters "Name=vpc-id,Values=vpc-xxx" \
  --query 'NetworkInterfaces[*].{ID:NetworkInterfaceId,Status:Status,Attachment:Attachment.AttachmentId}'

# Detach and delete each ENI
aws ec2 detach-network-interface --attachment-id <attachment-id> --force
aws ec2 delete-network-interface --network-interface-id <eni-id>

# Retry VPC deletion
```

### 2. Subnet CIDR Overlap After Migration

**Symptom**: Cannot add new subnets due to CIDR conflicts with existing allocations.

**Cause**: VPC CIDR is exhausted or overlaps with on-premises ranges.

**Workaround**: Use `aws_vpc_ipv4_cidr_block_association` to add a secondary CIDR:
```hcl
resource "aws_vpc_ipv4_cidr_block_association" "secondary" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.1.0.0/16"
}
```

### 3. Route Table Association Flapping

**Symptom**: Instances in some AZs lose internet connectivity intermittently.

**Cause**: Multiple route tables with overlapping associations, or Terraform state drift.

**Workaround**: Ensure explicit subnet-to-route-table association:
```hcl
resource "aws_route_table_association" "private" {
  for_each       = aws_subnet.private
  subnet_id      = each.value.id
  route_table_id = aws_route_table.private.id
}
```

### 4. NAT Gateway Throttling

**Symptom**: High latency and connection drops during peak traffic.

**Cause**: NAT Gateway throughput limit reached (45 Gbps, 55,000 connections).

**Workaround**: Deploy per-AZ NAT gateways and split traffic, or use VPC endpoints for AWS services to reduce NAT dependency:
```hcl
resource "aws_nat_gateway" "per_az" {
  for_each      = aws_subnet.public
  allocation_id = aws_eip.nat[each.key].id
  subnet_id     = each.value.id
}
```

### 5. Security Group Rule Limit

**Symptom**: Cannot add new security group rules — quota exceeded.

**Cause**: AWS default limit of 60 inbound + 60 outbound rules per security group.

**Workaround**: Use prefix-list based rules or split workloads across multiple security groups:
```bash
# Check current usage
aws ec2 describe-security-groups --group-ids sg-xxx \
  --query 'SecurityGroups[*].{Ingress:IpPermissions[*].IpRanges,IngressCount:IpPermissions.length()}'
```

## Dependency Ordering

```
aws_vpc.main                              (independent, foundation)
aws_internet_gateway.main                 (depends on aws_vpc.main)
aws_subnet.public[*]                      (depends on aws_vpc.main)
aws_subnet.private[*]                     (depends on aws_vpc.main)
aws_route_table.public                    (depends on aws_vpc.main, aws_internet_gateway.main)
aws_route_table.private                   (depends on aws_vpc.main)
aws_route_table_association.public[*]    (depends on route_table.public, aws_subnet.public[*])
aws_route_table_association.private[*]   (depends on route_table.private, aws_subnet.private[*])
aws_eip.nat                               (independent)
aws_nat_gateway.main                      (depends on aws_eip.nat, aws_subnet.public[*])
aws_route.private_nat                     (depends on aws_route_table.private, aws_nat_gateway.main)
aws_vpc_endpoint.s3                       (depends on aws_vpc.main, aws_route_table.private)
aws_network_acl.public                    (depends on aws_vpc.main)
aws_network_acl.private                   (depends on aws_vpc.main)
```

## Migration Notes

- **VPC Peering**: Cannot peer overlapping CIDRs. Plan IP ranges carefully if connecting to other VPCs or on-premises networks.
- **Subnet migration**: Moving a workload to a different subnet requires updating all references (security groups, load balancers, service discovery).
- **IPv6 enablement**: Can be added to existing VPCs without downtime. Assign IPv6 CIDR blocks and update route tables.
- **Cross-region VPC**: Use `aws_vpc_peering_connection` with `peer_region` for cross-region connectivity.
- **VPC sharing**: Use AWS Resource Access Manager to share subnets across accounts in the same organization.
