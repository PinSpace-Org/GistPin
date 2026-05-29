# Terraform Modules

Reusable Terraform modules for GistPin infrastructure.

## Structure

```
modules/
├── vpc/   — VPC, subnets, route tables, NAT gateway
├── rds/   — RDS PostgreSQL instance with parameter groups
└── eks/   — EKS cluster with managed node groups
```

## Usage

```hcl
module "vpc" {
  source = "./modules/vpc"
  name   = "gistpin-prod"
  cidr   = "10.0.0.0/16"
}

module "rds" {
  source     = "./modules/rds"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Version Constraints

All modules require:
- Terraform `>= 1.5.0`
- AWS provider `~> 5.0`

## Inputs / Outputs

Each module exposes typed input variables (`variables.tf`) and output values
(`outputs.tf`). See the `README.md` inside each module directory for the full
variable reference.
