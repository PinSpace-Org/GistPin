# Kubernetes Rolling Update Strategy Documentation

## Overview

GistPin uses disruption-aware rolling updates to minimize user impact during deployments. This document covers the configuration, monitoring, and rollback procedures for both backend and frontend services.

## Strategy Configuration

### Backend Service

| Parameter              | Value | Rationale                                   |
|------------------------|-------|---------------------------------------------|
| maxSurge               | 1     | One extra pod during rolling update          |
| maxUnavailable         | 0     | Zero downtime — all existing pods stay ready |
| minReadySeconds        | 30    | Wait for readiness probe to pass before continuing |
| progressDeadlineSeconds| 600   | 10 min deadline for deployment progress      |
| terminationGracePeriod | 60    | Allow time for in-flight requests to complete |

### Frontend Service

| Parameter              | Value | Rationale                                   |
|------------------------|-------|---------------------------------------------|
| maxSurge               | 1     | One extra pod during rolling update          |
| maxUnavailable         | 0     | Zero downtime                               |
| minReadySeconds        | 20    | Shorter wait for frontend readiness          |
| progressDeadlineSeconds| 300   | 5 min deadline (lighter service)             |
| terminationGracePeriod | 30    | Shorter drain period for static frontend     |

## Key Features

### PreStop Hooks

Both services implement `preStop` hooks with a sleep command:
- **Backend**: 15 seconds — allows load balancer to deregister the pod
- **Frontend**: 10 seconds — allows connection draining

### Pod Disruption Budgets

PDBs ensure at least 2 pods are always running during voluntary disruptions (node drains, cluster upgrades):

- `backend-pdb`: minAvailable: 2
- `frontend-pdb`: minAvailable: 2

### Topology Spread

Both deployments use `topologySpreadConstraints` to distribute pods across availability zones, preventing zone-level failures during updates.

## Update Flow

1. Kubernetes creates one new pod (maxSurge: 1)
2. New pod must pass readiness probe for `minReadySeconds`
3. Once ready, one old pod begins graceful termination
4. PreStop hook fires, pod is deregistered from load balancer
5. Process repeats until all pods are replaced

## Error Rate Spike Detection

If error rates spike during deployment:
- Kubernetes will not progress (pods fail readiness)
- `progressDeadlineSeconds` triggers a timeout
- The deployment enters a "Progressing" condition
- Manual rollback can be triggered

## Rollback Procedure

```bash
# Check deployment status
kubectl rollout status deployment/backend-deployment -n gistpin

# View rollout history
kubectl rollout history deployment/backend-deployment -n gistpin

# Rollback to previous revision
kubectl rollout undo deployment/backend-deployment -n gistpin

# Rollback to specific revision
kubectl rollout undo deployment/backend-deployment -n gistpin --to-revision=3
```

## Monitoring

Key metrics to watch during rolling updates:
- `kube_deployment_status_replicas_available` — should never drop below minAvailable
- `kube_deployment_status_replicas_unavailable` — should stay at 0
- `kube_deployment_spec_strategy_rolling_update_max_surge` — verify configuration
- Error rate from application metrics during deployment window

## Best Practices

1. Always use `maxUnavailable: 0` for production workloads
2. Set `minReadySeconds` to at least 1 readiness probe interval
3. Use PDBs with `minAvailable` >= desired replicas minus maxUnavailable
4. Monitor error rates during the update window
5. Keep `progressDeadlineSeconds` reasonable to detect stuck deployments
6. Use preStop hooks to allow load balancer deregistration
