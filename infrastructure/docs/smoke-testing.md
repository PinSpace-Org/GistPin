# Smoke Testing

Quick validation tests to confirm GistPin infrastructure is healthy after a deployment.

## Scripts

| Path | Purpose |
|------|---------|
| `infrastructure/scripts/smoke-tests.sh` | Service health, DB connectivity, external API reachability, DNS, SSL |
| `infrastructure/scripts/validate-services.sh` | Kubernetes deployment readiness, service endpoints, pod status |

## Usage

```bash
# Run smoke tests against local stack
bash infrastructure/scripts/smoke-tests.sh

# Run against a specific environment
BASE_URL=https://staging.gistpin.io bash infrastructure/scripts/smoke-tests.sh

# Validate k8s services in a namespace
NAMESPACE=gistpin bash infrastructure/scripts/validate-services.sh
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Base URL for health endpoint checks |
| `DATABASE_URL` | _(empty)_ | PostgreSQL connection string for DB check |
| `NAMESPACE` | `gistpin` | Kubernetes namespace for service validation |

## Checks performed

### smoke-tests.sh
- **Service health** — HTTP 200 on `/health`, `/health/db`, `/health/liveness`, `/health/readiness`
- **Database connectivity** — `psql` connection test (skipped if `DATABASE_URL` unset)
- **External API reachability** — Stellar Horizon, ipify
- **DNS resolution** — `dig` / `getent` lookup for external hosts
- **SSL validation** — `openssl` certificate verification

### validate-services.sh
- **Deployment readiness** — all replicas ready
- **Service endpoints** — each service has at least one endpoint
- **Pod status** — all pods Running or Completed

## CI integration

Add to your deployment workflow after applying manifests:

```yaml
- name: Run smoke tests
  run: bash infrastructure/scripts/smoke-tests.sh
  env:
    BASE_URL: ${{ vars.STAGING_URL }}

- name: Validate k8s services
  run: bash infrastructure/scripts/validate-services.sh
  env:
    NAMESPACE: gistpin
```
