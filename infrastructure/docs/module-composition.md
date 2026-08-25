# Terraform Module Composition Patterns

## Overview

GistPin uses composable Terraform module patterns to enable infrastructure reuse across different deployment scenarios. This document describes the composition patterns and provides examples.

## Composition Types

### Full-Stack Composition

The `full-stack.tf` composition includes all infrastructure modules:

```
full-stack
├── vpc          → Networking foundation
├── eks          → Kubernetes cluster
├── rds          → Database layer
├── monitoring   → Observability stack
├── security     → Security controls
└── gpu_nodes    → Optional GPU nodes (conditional)
```

### Minimal Composition

The `minimal.tf` composition includes only essential modules:

```
minimal
├── vpc          → Networking foundation
└── eks          → Kubernetes cluster
```

## Module Output Chaining

Modules communicate through output chaining:

```hcl
module "vpc" {
  source = "../../terraform"
  # ...
}

module "eks" {
  source = "../../terraform"

  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  vpc_id             = module.vpc.vpc_id

  depends_on = [module.vpc]
}
```

### Chaining Rules

1. VPC always runs first (no upstream dependencies)
2. EKS depends on VPC (needs subnet IDs)
3. RDS depends on VPC (needs private subnets)
4. Monitoring depends on EKS (needs cluster name)
5. Security depends on VPC (needs VPC ID for SG rules)

## Conditional Module Inclusion

Use `count` for optional modules:

```hcl
module "gpu_nodes" {
  source = "../../terraform"
  count  = var.enable_gpu ? 1 : 0

  environment  = var.environment
  project_name = var.project_name
  region       = var.region

  depends_on = [module.eks]
}
```

## Module Versioning Strategy

### Pinning

- All modules use `source = "../../terraform"` for local development
- Production uses versioned module references: `source = "git::https://github.com/PinSpace-Org/GistPin//infrastructure/terraform?ref=v1.2.3"`

### Version Constraints

```hcl
module "vpc" {
  source  = "git::https://github.com/PinSpace-Org/GistPin//infrastructure/terraform?ref=~> 1.2"
  # ...
}
```

## Adding a New Module

1. Create the module in `infrastructure/terraform/modules/<name>/`
2. Define `variables.tf`, `main.tf`, `outputs.tf`
3. Add the module to the appropriate composition
4. Wire outputs from dependent modules
5. Add composition tests in `infrastructure/terraform/tests/`

## Best Practices

1. Keep modules focused on a single resource type
2. Use output chaining to minimize coupling
3. Prefer conditional inclusion over boolean toggles within modules
4. Version modules independently
5. Test compositions with Terraform test framework
6. Use workspaces for environment separation
