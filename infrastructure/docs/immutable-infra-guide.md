# Immutable Infrastructure Guide - GistPin

This document describes the immutable infrastructure pipeline implemented for GistPin, following the principles that infrastructure components are built once, versioned, signed, and never modified after deployment. Any changes require building new versions with new version identifiers.

## Overview

The immutable infrastructure pipeline (issue #556) enforces that all infrastructure changes go through a rigorous build, sign, deploy process. No changes are ever made to running infrastructure - updates always deploy entirely new, versioned artifacts.

## Core Principles

1. **Immutable Artifacts**: Once built, infrastructure components are never modified
2. **Version Everything**: Every deployment has a unique version identifier
3. **Sign All Artifacts**: Cryptographic signing ensures integrity and authenticity
4. **Automated Lifecycle**: Full CI/CD pipeline handles build, validate, sign, deploy, monitor
5. **Rollback Capability**: Always able to roll back to a previous known-good version

## Pipeline Architecture

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐     ┌────────────┐
│   Code Push │────►│   Validate   │────►│   Build   │────►│    Sign    │
└─────────────┘     └──────────────┘     └───────────┘     └────────────┘
                                                           │
                                                           ▼
                                                    ┌────────────┐
                                                    │   Deploy   │
                                                    └────────────┘
                                                           │
                                                           ▼
                                                    ┌────────────┐
                                                    │   Monitor  │
                                                    └────────────┘
```

## Pipeline Stages

### 1. Validate
The first stage validates all infrastructure code before any build process begins:
- Terraform fmt, init, and validate
- Helm chart linting
- Snyk infrastructure-as-code scanning for vulnerabilities
- YAML/JSON linting and validation
- Policy enforcement (OPA/Rego if configured)

Files:
- `infrastructure/ci/immutable-infra-pipeline.yml` (GitHub Actions workflow)

### 2. Build
Creates an immutable container image containing all infrastructure components:
- Bundles all Terraform, Kubernetes manifests, CI scripts, and documentation
- Bakes in metadata (version, git commit, build timestamp, builder)
- Creates a single versioned artifact that can be promoted through environments
- Generates SBOM (Software Bill of Materials) for all components

Dockerfile:
- `infrastructure/docker/infra-bundle.Dockerfile` - Defines the infrastructure bundle image

### 3. Sign
Cryptographically signs all artifacts to ensure they haven't been tampered with:
- Cosign for container image signing and verification
- SBOM generation and signing
- Provenance metadata creation
- Verifiable signatures that can be checked at deployment time

### 4. Deploy
Deploys the versioned infrastructure bundle to the target environment:
- Terraform apply with explicit version variables
- Helm upgrade with the exact image tag
- Waits for all resources to become ready
- Runs post-deployment health checks
- Sends notifications to Slack/teams

### 5. Monitor
Continuous monitoring of the deployed infrastructure:
- All metrics and logs are tagged with the infrastructure version
- Alerts fire if any component mismatches the expected version
- Automatic rollback triggers if health checks fail
- Audit logging of all deployments and changes

## Versioning Scheme

Infrastructure versions follow this format:
```
{git-short-sha}-{timestamp}
```

Example: `a1b2c3d-20240115143000`

For manual releases, you can specify a semantic version:
```
v1.2.3
```

## Artifact Structure

The infrastructure bundle container image contains:
```
/infra/
├── metadata.env          # Build metadata and version info
├── terraform/            # Terraform modules and environments
├── k8s/                 # Kubernetes manifests and Helm charts
├── ci/                  # CI/CD scripts and configurations
├── docker/              # Dockerfile definitions
├── docs/                # All infrastructure documentation
└── monitoring/          # Prometheus rules, Grafana dashboards
```

## Usage Instructions

### Triggering a Deployment

1. **Automatic deployment**: Any push to main that modifies infrastructure code automatically deploys to staging
2. **Manual deployment**: Use the GitHub Actions workflow_dispatch trigger to deploy to a specific environment
3. **Production promotion**: Only deploy to production after successful staging validation

### Environment Promotion Workflow
```
dev → staging → production
```

Each environment receives the exact same artifact that was built in the build stage - the image is never rebuilt between environments, ensuring consistency.

## Deployment Process

### Prerequisites
1. GitHub repository secrets configured:
   - `GITHUB_TOKEN` - For package registry access
   - `KUBE_CONFIG_DATA` - Kubernetes cluster access
   - `SNYK_TOKEN` - For security scanning
   - `SLACK_WEBHOOK_URL` - For deployment notifications
   - Cloud provider credentials for your environment

### Running a Manual Deployment
1. Go to GitHub Actions → Immutable Infrastructure Pipeline
2. Click "Run workflow"
3. Select environment (dev/staging/production)
4. Optionally specify a version tag
5. Click "Run workflow"

## Verification and Validation

Before any deployment is considered complete, it must pass:
1. All infrastructure validation checks
2. Container image signature verification
3. Post-deployment health checks for all services
4. Database connectivity and migration success
5. Ingress and external access validation

## Rollback Procedure

If a deployment fails, the pipeline automatically triggers a rollback:
1. Identifies the previous stable version
2. Reapplies that version to the cluster
3. Verifies rollback success with health checks
4. Sends failure and rollback notifications
5. Creates an incident for post-mortem analysis

To manually rollback:
```bash
# Use the GitHub Actions rollback workflow
gh workflow run rollback.yml -f version=a1b2c3d-20240115143000 -f environment=production
```

## Security Features

1. **Non-root container**: The infrastructure bundle runs as non-root user
2. **Image signing**: All images are signed with Cosign and must be verified before deployment
3. **SBOM generation**: Complete software inventory for every deployment
5. **Snyk scanning**: Continuous vulnerability scanning
6. **Least privilege RBAC**: Infrastructure service accounts have minimal necessary permissions
7. **Audit logging**: All deployment activities are logged and immutable

## Best Practices

1. **Never modify running infrastructure**: Always go through the pipeline to deploy changes
2. **Test everything in dev first**: Catch issues before they reach staging or production
3. **Keep versions small and frequent**: Many small deployments are safer than large monolithic ones
4. **Always verify signatures**: Never deploy an unsigned artifact
5. **Maintain rollback history**: Keep at least 5 previous versions available for rollback
6. **Monitor drift continuously**: Detect and alert on any configuration drift from the desired state
7. **Document all changes**: Every version should have clear release notes

## Troubleshooting

### Pipeline Failures
- Check the GitHub Actions logs for specific failure details
- Validate infrastructure code locally before pushing
- Ensure all secrets are properly configured
- Verify cloud provider quota and limits

### Deployment Failures
- Check Kubernetes event logs for deployment issues
- Verify that the image exists in the container registry and is accessible
- Confirm that all secrets exist in the target namespace
- Rollback to the previous version and investigate

### Signature Verification Failures
- Ensure the correct Cosign key is being used
- Verify that the image wasn't modified after build
- Check that the CI process has the correct signing credentials

## References
- [Immutable Infrastructure](https://en.wikipedia.org/wiki/Immutable_infrastructure)
- [Cosign Documentation](https://docs.sigstore.dev/cosign/overview/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [Helm Best Practices](https://helm.sh/docs/chart_best_practices/)