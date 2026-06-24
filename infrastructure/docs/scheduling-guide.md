# Kubernetes Scheduling Guide - GistPin

This document describes the pod affinity, anti-affinity, and node affinity rules implemented in the GistPin Kubernetes cluster to ensure optimal performance, high availability, and proper workload distribution.

## Overview

The scheduling rules are defined in two primary files:
- `infrastructure/k8s/affinity/backend-affinity.yaml`: Affinity rules for backend-database co-location and GPU workload scheduling
- `infrastructure/k8s/affinity/anti-affinity-rules.yaml`: Anti-affinity rules for replica distribution across nodes

## Backend-Database Affinity Rules

To ensure low-latency communication between backend services and the PostgreSQL database, we implement strict affinity rules that prioritize co-location.

### Node Affinity (Required)
Backend pods must be scheduled in the same availability zone as the database:
```yaml
nodeAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
    nodeSelectorTerms:
    - matchExpressions:
      - key: topology.kubernetes.io/zone
        operator: In
        values:
        - us-central1-a
```

This ensures network latency between backend and database remains minimal by forcing both workloads into the same cloud region and zone.

### Pod Affinity (Preferred)
We prefer to schedule backend pods on the same node as the database when possible:
```yaml
podAffinity:
  preferredDuringSchedulingIgnoredDuringExecution:
  - weight: 100
    podAffinityTerm:
      labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - postgres
      topologyKey: kubernetes.io/hostname
      namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: gistpin
```

The high weight (100) makes this a strong preference, while still allowing the scheduler to place backend pods on other nodes if database node resources are exhausted.

## GPU Workload Scheduling

For backend services that require GPU acceleration (e.g., machine learning inference, media processing), additional affinity rules ensure these workloads are scheduled in zones with GPU-capable nodes:

```yaml
- weight: 50
  podAffinityTerm:
    labelSelector:
      matchExpressions:
      - key: workload-type
        operator: In
        values:
        - gpu-workload
    topologyKey: topology.kubernetes.io/zone
```

## Anti-Affinity Rules for High Availability

To ensure high availability of all services, we implement pod anti-affinity rules that prevent multiple replicas from being scheduled on the same node.

### Backend Deployment Anti-Affinity
```yaml
podAntiAffinity:
  requiredDuringSchedulingIgnoredDuringExecution:
  - labelSelector:
      matchExpressions:
      - key: app
        operator: In
        values:
        - backend
    topologyKey: kubernetes.io/hostname
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: gistpin
```

This is a hard requirement that ensures no single node failure can take down multiple backend replicas. With 3 replicas configured, the scheduler must place each on a separate node.

### Applicable Workloads
These anti-affinity rules apply to:
- Backend API servers (3 replicas)
- Frontend web servers (3 replicas)
- Redis cache cluster (3 replicas)
- Any other stateful or stateless services requiring high availability

## Workload Types

Workloads are labeled to facilitate proper scheduling:

| Label Key | Values | Purpose |
|-----------|--------|---------|
| `app` | `backend`, `frontend`, `postgres`, `redis` | Core application identification |
| `workload-type` | `cpu-workload`, `gpu-workload`, `memory-intensive` | Resource type classification |
| `environment` | `dev`, `staging`, `production` | Deployment environment |

## Validation and Best Practices

1. **Always test scheduling rules in staging first** before promoting to production
2. **Monitor pod distribution** using Kubernetes dashboard or metrics server to ensure rules are working as expected
3. **Review node capacity** regularly to ensure there are enough nodes to satisfy anti-affinity constraints
4. **Update zone names** if deploying to a different cloud region
5. **Adjust weights** based on your specific latency and availability requirements

## Troubleshooting

If pods remain in `Pending` state:
1. Check if you have enough nodes to satisfy anti-affinity rules
2. Verify node labels match the topology keys used in affinity rules
3. Ensure namespace labels are correctly configured
4. Check event logs using `kubectl describe pod <pod-name>` for specific scheduling failures

## References
- [Kubernetes Affinity Documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)
- [Inter-pod affinity and anti-affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/inter-pod-affinity/)
- [Node affinity](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#node-affinity)