# Import Guide

## Overview

Terraform 1.5+ introduced `import` blocks as a declarative way to bring existing infrastructure under Terraform management. This replaces the older `terraform import` CLI approach.

## Import Block Syntax

Import blocks are defined in `infrastructure/terraform/imports.tf`:

```hcl
import {
  id = "<RESOURCE_ID>"
  to = <RESOURCE_TYPE>.<RESOURCE_NAME>
}
```

### Supported Resources

| Resource | ID Format | Example |
|----------|-----------|---------|
| VPC | vpc-xxxxxxxx | `vpc-12345678` |
| Subnet | subnet-xxxxxxxx | `subnet-12345678` |
| EKS Cluster | cluster-name | `gistpin-eks-cluster` |
| RDS Instance | db-instance-id | `gistpin-db-prod` |
| S3 Bucket | bucket-name | `gistpin-terraform-state` |
| DynamoDB Table | table-name | `gistpin-terraform-locks` |
| IAM Role | role-name | `eks-node-role` |
| Security Group | sg-xxxxxxxx | `sg-12345678` |
| ALB | arn:aws:elasticloadbalancing:... | Full ARN |
| Route53 Record | zone-id_record-name_type | `Z1234567890ABCDEFGHIJ_gistpin.io_A` |

## Import Process

### 1. Define the Resource in Configuration

Ensure a matching resource block exists in `.tf` files:

```hcl
resource "aws_s3_bucket" "terraform_state" {
  bucket = "gistpin-terraform-state"
}
```

### 2. Add Import Block

Add an import block in `imports.tf`:

```hcl
import {
  id = "gistpin-terraform-state"
  to = aws_s3_bucket.terraform_state
}
```

### 3. Plan and Verify

```bash
terraform plan -var="environment=staging" -generate-config-out=generated.tf
```

Review the plan to ensure Terraform maps the resource correctly without unexpected changes.

### 4. Apply

```bash
terraform apply -var="environment=staging"
```

### 5. Verify State

```bash
terraform state list | grep aws_s3_bucket.terraform_state
terraform state show aws_s3_bucket.terraform_state
```

## Verification Steps

### Pre-Import Checklist

1. Resource exists in AWS console or via CLI
2. Terraform configuration matches existing resource attributes
3. No other Terraform workspace manages the same resource
4. Resource can be imported without downtime
5. Team notified of import operation

### Post-Import Verification

1. `terraform plan` shows no destructive changes
2. Resource attributes match expected values
3. State file updated correctly
4. Run `bash infrastructure/scripts/validate-state.sh`

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Resource already in state | Run `terraform state rm <address>` before importing |
| Configuration mismatch | Update `.tf` to match existing resource attributes |
| Cannot import resource | Check IAM permissions for read access |
| Plan shows resource recreation | Add `lifecycle { prevent_destroy = true }` |

## Removing Import Blocks

After successful import, remove the import block to prevent re-importing on future applies:

```bash
# Remove the import block for the resource
# Keep the resource definition in .tf files
```

## Bulk Import Script

```bash
for bucket in $(aws s3api list-buckets --query 'Buckets[].Name' --output text); do
  echo "import { id = \"${bucket}\"; to = aws_s3_bucket.${bucket//-/_} }"
done
```
