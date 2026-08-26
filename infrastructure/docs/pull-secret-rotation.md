# Image Pull Secret Rotation

## Overview

Automated rotation of Docker image pull secrets ensures zero-downtime access to private container registries. The rotation runs monthly via a Kubernetes CronJob and can be triggered manually.

## How It Works

1. **CronJob Schedule**: Runs on the 1st of each month at 02:00 UTC
2. **Secret Creation**: Creates/updates the `ghcr-pull-secret` docker-registry secret
3. **Service Account Patching**: Updates all service accounts with the new pull secret
4. **Verification**: Confirms the secret exists and is valid after rotation

## Manual Rotation

```bash
# Rotate with inline credentials
./infrastructure/scripts/rotate-pull-secrets.sh \
  --username YOUR_USERNAME \
  --password YOUR_TOKEN

# Dry-run mode
DRY_RUN=true ./infrastructure/scripts/rotate-pull-secrets.sh \
  --username YOUR_USERNAME \
  --password YOUR_TOKEN

# Rotate in multiple namespaces
./infrastructure/scripts/rotate-pull-secrets.sh \
  -n "gistpin,staging" \
  -u YOUR_USERNAME \
  -p YOUR_TOKEN
```

## Configuration

| Parameter         | Default            | Description                    |
|-------------------|--------------------|--------------------------------|
| --secret          | ghcr-pull-secret   | Kubernetes secret name         |
| --registry        | ghcr.io            | Container registry URL         |
| --namespaces      | gistpin            | Target namespaces              |
| --dry-run         | false              | Preview mode without changes   |

## Zero-Downtime Rotation

The rotation process ensures zero downtime by:

1. Creating the new secret before removing the old one
2. Using `kubectl apply` for idempotent updates
3. Patching service accounts after secret creation
4. Running in a single namespace at a time

## Service Account Impact

After rotation, all pods scheduled on nodes that pull images will use the updated credentials. Existing running pods continue using cached credentials until restart.

## Troubleshooting

### Secret not found
```bash
kubectl get secret ghcr-pull-secret -n gistpin
```

### Rotation job failed
```bash
kubectl get jobs -n gistpin -l app=pull-secret-rotation
kubectl logs job/<job-name> -n gistpin
```

### Manual secret creation
```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace=gistpin \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN
```
