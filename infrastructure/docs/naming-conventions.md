# Naming Conventions

All GistPin Terraform resources and Kubernetes objects follow a consistent naming
scheme to enable cost allocation, compliance auditing, and automated tooling.

## Pattern

```
{project}-{environment}-{component}[-{qualifier}]
```

| Segment | Values | Example |
|---|---|---|
| project | `gistpin` | `gistpin` |
| environment | `dev`, `staging`, `prod` | `prod` |
| component | resource type or service | `backend`, `db`, `alb` |
| qualifier | optional sub-type | `sg`, `role`, `policy` |

## Rules

| Rule | Detail |
|---|---|
| Lowercase only | No uppercase letters anywhere |
| Hyphens for Terraform | Use `-` between segments in AWS resource names |
| Underscores for Terraform identifiers | Use `_` in HCL resource/variable identifiers |
| Max length | 63 characters (AWS S3 bucket limit) |
| Valid chars | `[a-z0-9][a-z0-9\-_]*` |
| Environment required | Every name must contain the environment segment |

## Examples

```hcl
# Good
resource "aws_s3_bucket" "gistpin_prod_assets" {
  bucket = "gistpin-prod-assets"
}

# Bad — uppercase, no environment
resource "aws_s3_bucket" "GistPinAssets" {
  bucket = "GistPinAssets"
}
```

## CI enforcement

The naming policy is enforced by:
1. `infrastructure/scripts/validate-names.sh` — lint step on every PR
2. `infrastructure/terraform/naming-policy.sentinel` — Sentinel policy blocks apply on violations
