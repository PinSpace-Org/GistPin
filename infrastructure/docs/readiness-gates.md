# Kubernetes Readiness Gates

## Overview

Readiness gates extend Kubernetes readiness semantics by adding custom conditions that must be satisfied before a pod is considered ready. GistPin uses readiness gates to ensure traffic is only routed to pods that have fully verified their dependencies.

## How It Works

1. **ReadinessGate CRD** defines conditions that must be met for a deployment
2. **Gate Controller** continuously evaluates health checks for each condition
3. **Pod Readiness** is gated on all conditions being `True`
4. **Traffic Routing** only occurs when all gates pass

## Conditions

### Backend Gates

| Condition | Check | Timeout |
|-----------|-------|---------|
| DatabaseReady | PostgreSQL connection pool health | 300s |
| CacheReady | Redis connection established | 300s |
| ExternalDependenciesReady | All external services reachable | 300s |

### Frontend Gates

| Condition | Check | Timeout |
|-----------|-------|---------|
| BackendAPIReady | Backend /health endpoint responding | 180s |
| StaticAssetsReady | CDN serving static assets | 180s |

## Failure Action

- **FailClosed**: If any gate times out, the pod is marked as not ready
- Traffic is immediately removed from the load balancer
- Kubernetes liveness probe continues running independently

## Deployment

The gate controller runs as a Deployment with:

```yaml
replicas: 2
strategy: RollingUpdate
resources:
  requests: 50m/64Mi
  limits: 100m/128Mi
```

## Health Check Configuration

Health checks are defined in the `readiness-gate-config` ConfigMap:

```yaml
healthChecks:
  database:
    type: postgres
    host: gistpin-postgres.gistpin.svc.cluster.local
    port: 5432
    timeout: 5s
    interval: 10s
    healthyThreshold: 3
    unhealthyThreshold: 3
```

## Monitoring

- Controller exposes `/healthz` and `/status` endpoints
- Gate conditions are available via Prometheus metrics
- Alerts fire when gates remain in `False` state for > 5 minutes

## API Reference

### GET /status

Returns current gate conditions:

```json
{
  "DatabaseReady": [{
    "type": "DatabaseReady",
    "status": "True",
    "reason": "DatabaseConnectionHealthy",
    "message": "PostgreSQL connection pool is healthy",
    "lastTransitionTime": "2024-01-01T00:00:00Z"
  }]
}
```

### GET /healthz

Returns 200 OK if the controller is running.
