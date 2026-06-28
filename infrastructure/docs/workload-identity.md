# Kubernetes Workload Identity

## Overview

GistPin uses AWS IRSA (IAM Roles for Service Accounts) to provide pod-level AWS credentials without storing static keys in Secrets.

## Architecture

```
Pod (ServiceAccount: backend)
        |
        | EKS OIDC Provider (sts:AssumeRoleWithWebIdentity)
        |
AWS IAM Role (gistpin-backend-irsa)
        |
IAM Policies (S3, DynamoDB, Secrets Manager)
```

## Components

| Component | File | Purpose |
|-----------|------|---------|
| IAM Roles + Policies | `infrastructure/terraform/irsa.tf` | AWS-side IRSA configuration |
| Service Accounts | `infrastructure/k8s/service-accounts/backend-sa.yaml` | K8s-side annotations |
| Documentation | `infrastructure/docs/workload-identity.md` | This document |

## Service Account Mappings

| Service Account | IAM Role | Permissions |
|----------------|----------|-------------|
| `backend` | `gistpin-backend-irsa` | S3 (read/write), DynamoDB (CRUD), Secrets Manager (read) |
| `frontend` | `gistpin-frontend-irsa` | S3 (read), CloudFront (invalidation) |
| `tekton-worker` | `gistpin-ci-irsa` | AdministratorAccess (CI only) |

## Adding a New Service Account

1. Create IAM role in `infrastructure/terraform/irsa.tf` with OIDC condition
2. Create ServiceAccount in `infrastructure/k8s/service-accounts/`
3. Annotate with `eks.amazonaws.com/role-arn`
4. Update pods to use the new ServiceAccount

## Verification

```bash
# Verify pod has the correct service account
kubectl get pod <pod-name> -n gistpin -o json | jq '.spec.serviceAccount'

# Verify IRSA is working (from within the pod)
aws sts get-caller-identity

# Check OIDC provider
aws iam list-open-id-connect-providers
```

## Audit Logging

All `sts:AssumeRoleWithWebIdentity` calls are logged to CloudTrail. Monitor for:
- AssumeRole calls from unexpected service accounts
- AssumeRole calls from unexpected namespaces
- Rate anomalies in AssumeRole calls
