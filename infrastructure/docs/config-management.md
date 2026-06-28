# Configuration Management

## Overview

GistPin manages environment-specific configuration across three environments: **development**, **staging**, and **production**. This document outlines the configuration strategy, validation process, and best practices.

## Configuration Sources

| Source | Format | Purpose |
|--------|--------|---------|
| `.env.*` files | `KEY=VALUE` | Application-level environment variables |
| Terraform `.tfvars` | HCL | Infrastructure variable overrides per environment |
| Kubernetes ConfigMaps | YAML | Runtime configuration injected into pods |

## Validation Pipeline

The configuration validation pipeline (`infrastructure/ci/config-validation.yml`) runs on every PR and push that modifies configuration files. It performs:

1. **Terraform variable consistency** - Ensures all required variables exist across environment `.tfvars` files
2. **ConfigMap key parity** - Detects missing or extra keys between environment ConfigMaps
3. **Env file completeness** - Validates all variables defined in `.env.*.example` exist in the corresponding `.env.*` file

## Adding a New Configuration Variable

1. Add the variable to all environment files (dev, staging, production)
2. Update the corresponding `.env.*.example` file
3. If it's a Terraform variable, add it to `infrastructure/terraform/variables.tf`
4. If it's a Kubernetes ConfigMap key, add it to all environment ConfigMaps

## Blocking Deployments

Critical configuration inconsistencies block deployments on the `main` branch. The pipeline exits with a non-zero code when:
- A required variable is missing in any environment
- A ConfigMap key exists in one environment but not another
- Terraform variable files are malformed or missing

## Best Practices

- Never commit secrets to `.env.*` files; use Kubernetes Secrets or AWS Secrets Manager
- Keep `.env.*.example` files in sync with actual environment files
- Use Terraform workspaces or Terragrunt for environment-specific infrastructure
- Review config diffs carefully during code review
