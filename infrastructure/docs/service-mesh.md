# Service Mesh Configuration

Automated Istio service mesh setup for GistPin.

## Scripts

| Path | Purpose |
|------|---------|
| `infrastructure/scripts/configure-mesh.sh` | Enables sidecar injection, applies mesh configs, verifies control plane |

## Manifests

| Path | Purpose |
|------|---------|
| `infrastructure/k8s/mesh-config/traffic-policy.yaml` | DestinationRule (circuit breaker, retries) + VirtualService (timeouts, retries) |

## Usage

```bash
# Apply full mesh configuration
NAMESPACE=gistpin bash infrastructure/scripts/configure-mesh.sh

# Apply a single manifest
kubectl apply -f infrastructure/k8s/mesh-config/traffic-policy.yaml
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NAMESPACE` | `gistpin` | Kubernetes namespace to label for sidecar injection |
| `MESH_CONFIG_DIR` | `infrastructure/k8s/mesh-config` | Directory of mesh manifests to apply |

## Features configured

- **Sidecar injection** — namespace label `istio-injection=enabled`
- **Traffic routing** — VirtualService with 10 s global timeout
- **Circuit breaker** — ejects hosts after 5 consecutive 5xx errors
- **Retry policy** — 3 attempts, 3 s per-try timeout, retries on 5xx/reset/connect-failure
- **Connection pool** — limits concurrent connections to prevent cascade failures

## Prerequisites

- Istio installed in the cluster (`istioctl install` or Helm chart)
- `kubectl` configured with cluster access
