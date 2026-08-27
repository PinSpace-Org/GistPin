# Kubernetes Zone-Aware Routing

Topology-aware routing reduces cross-zone traffic costs and latency by preferring endpoints in the same availability zone as the client pod.

## How It Works

1. Node zone labels (`topology.kubernetes.io/zone`) are set by the cloud CCM
2. Services annotated with `topology-mode: Auto` get endpoint hints auto-populated
3. kube-proxy on each node routes to same-zone endpoints when available
4. Falls back to all zones if local capacity < 10% of total

## Setup

### Enable on a Service
```yaml
metadata:
  annotations:
    service.kubernetes.io/topology-mode: "Auto"
```

### Spread Pods Across Zones
```yaml
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        app: gistpin-api
```

### Validate Hints Are Applied
```bash
kubectl get endpointslices -n production -o yaml | grep -A3 hints
```

### Validate Node Labels
```bash
kubectl get nodes --label-columns topology.kubernetes.io/zone
```

## Fallback Behaviour

When a zone has fewer than 10% of total pods, the EndpointSlice controller removes hints for that zone to prevent overload, causing kube-proxy to distribute evenly across all zones.

## Traffic Distribution Validation
```bash
# Check per-zone endpoint distribution
kubectl get endpointslices -n production -o jsonpath=\
'{range .items[*]}{.metadata.name}{"\n"}{range .endpoints[*]}  zone={.zone} ready={.conditions.ready}{"\n"}{end}{end}'
```
