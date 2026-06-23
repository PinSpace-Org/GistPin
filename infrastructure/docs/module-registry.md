# Terraform Module Registry

GistPin uses a private Terraform module registry backed by AWS CodeArtifact for versioned, access-controlled module distribution.

## Overview

- **Registry backend**: AWS CodeArtifact (`gistpin` domain, `terraform-modules` repository)
- **Module directory**: `infrastructure/terraform/modules/`
- **Publish trigger**: Git tag matching `tf-module/v*`

## Using a Module

1. Obtain an auth token:

   ```bash
   export TF_REGISTRY_TOKEN=$(aws codeartifact get-authorization-token \
     --domain gistpin --query authorizationToken --output text)
   ```

2. Reference the module in Terraform:

   ```hcl
   module "eks" {
     source  = "<registry-endpoint>/eks"
     version = "1.2.0"
   }
   ```

## Publishing a New Module Version

1. Create or update your module under `infrastructure/terraform/modules/<name>/`.
2. Ensure all variables and outputs are documented.
3. Tag the commit:

   ```bash
   git tag tf-module/v1.0.0
   git push origin tf-module/v1.0.0
   ```

   The `publish-module.yml` CI workflow validates, generates docs, and publishes automatically.

## Version Management

Modules follow semantic versioning: `MAJOR.MINOR.PATCH`.

| Change type | Version bump |
|-------------|-------------|
| Breaking change to interface | MAJOR |
| New optional variable | MINOR |
| Bug fix, no interface change | PATCH |

## Access Controls

Access is restricted to the AWS account root and roles listed in `registry-config.tf`.
New teams must request access via the infrastructure team.

## Module Catalog

| Module | Description | Latest |
|--------|-------------|--------|
| `eks` | EKS cluster with managed node groups | 1.0.0 |
| `rds` | RDS PostgreSQL with parameter groups | 1.0.0 |
| `vpc` | VPC with public/private subnets | 1.0.0 |
