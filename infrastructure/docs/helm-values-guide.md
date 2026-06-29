# Helm Values Guide

## Overview

GistPin uses a single Helm chart located at `infrastructure/k8s/` with values defined in `infrastructure/k8s/values.yaml`. Values are validated against a JSON Schema at `infrastructure/k8s/helm/gistpin/values.schema.json`.

## Values Structure

### Global

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `global.imagePullSecrets` | array | `[]` | Secrets for pulling from private registries |
| `global.nameOverride` | string | `""` | Override chart component name |
| `global.fullnameOverride` | string | `""` | Override full resource names |

### Backend

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `backend.enabled` | boolean | `true` | Enable backend deployment |
| `backend.image.repository` | string | `ghcr.io/pinspace-org/gistpin` | Container image |
| `backend.image.tag` | string | Chart appVersion | Image tag |
| `backend.image.pullPolicy` | enum | `IfNotPresent` | Always, IfNotPresent, Never |
| `backend.replicaCount` | integer | `2` | Number of replicas (1-100) |
| `backend.service.type` | enum | `ClusterIP` | ClusterIP, NodePort, LoadBalancer, ExternalName |
| `backend.service.port` | integer | `80` | Service port |
| `backend.service.targetPort` | integer | `3000` | Container port |

### Analytics

Same structure as Backend. Default replica count is 1. Service target port is 3001.

### Ingress

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ingress.enabled` | boolean | `false` | Enable ingress controller |
| `ingress.className` | string | `nginx` | Ingress class name |
| `ingress.hosts` | array | — | Virtual host configuration |
| `ingress.tls` | array | `[]` | TLS certificate configuration |

### PostgreSQL

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `postgresql.enabled` | boolean | `true` | Enable PostgreSQL sub-chart |
| `postgresql.auth.database` | string | `gist` | Database name |
| `postgresql.auth.username` | string | `gist` | Database user |
| `postgresql.primary.persistence.size` | string | `10Gi` | PVC size |

### Redis

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `redis.enabled` | boolean | `false` | Enable Redis sub-chart |
| `redis.architecture` | enum | — | `standalone` or `replication` |

## Schema Validation

### How Validation Works

1. **Static validation**: The schema is validated as valid JSON on every PR/push.
2. **Helm lint**: Runs `helm lint --strict` against the chart with environment-specific values.
3. **ajv validation**: Uses the AJV JSON Schema validator to check values against the schema.
4. **Environment validation**: Validates values for `dev`, `staging`, and `production` environments.

### Required Fields

The schema enforces these top-level fields as required:

- `global`
- `backend`
- `analytics`
- `ingress`
- `postgresql`
- `serviceAccount`

### Enum Constraints

| Field | Allowed Values |
|-------|---------------|
| `env` | `dev`, `staging`, `production` |
| `image.pullPolicy` | `Always`, `IfNotPresent`, `Never` |
| `service.type` | `ClusterIP`, `NodePort`, `LoadBalancer`, `ExternalName` |
| `ingress.hosts[].paths[].pathType` | `Prefix`, `Exact`, `ImplementationSpecific` |
| `redis.architecture` | `standalone`, `replication` |

### Type Validation Rules

- `replicaCount`: integer, minimum 1, maximum 100
- Ports: integer, range 1–65535
- CPU resources: string matching `^[0-9]+m?$` (e.g., `100m`, `1`)
- Memory resources: string matching `^[0-9]+(Mi\|Gi\|Ki)$` (e.g., `256Mi`, `1Gi`)
- `env` field: must be one of `dev`, `staging`, `production`

## Customization Guide

### Adding a New Environment Variable

```yaml
backend:
  env:
    MY_NEW_VAR: "value"
  extraEnv:
    - name: MY_OTHER_VAR
      value: "other-value"
```

### Using an External Database

```yaml
postgresql:
  enabled: false
backend:
  env:
    DATABASE_HOST: "my-external-db.amazonaws.com"
    DATABASE_PORT: "5432"
    DATABASE_NAME: "gist"
```

### Enabling TLS

```yaml
ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    - secretName: gistpin-tls
      hosts:
        - api.gistpin.io
```

### Scaling for Production

```yaml
backend:
  replicaCount: 5
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 20
    targetCPUUtilizationPercentage: 70
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
```

## CI Integration

Schema validation runs automatically via `helm-schema-validate.yml` on:

- Pull requests touching `infrastructure/k8s/`
- Pushes to `main` touching `infrastructure/k8s/`

On validation failure, a comment is posted on the PR with common issue categories.
