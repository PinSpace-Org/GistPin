# Kubernetes Service Topology Awareness

## Overview

Zone-aware routing ensures traffic stays within the same availability zone where
possible, reducing cross-zone data transfer costs and latency.

## How it works

1. Nodes are labelled `topology.kubernetes.io/zone` by EKS automatically.
2. `topologySpreadConstraints` in Deployments spread pods evenly across zones.
3. `trafficDistribution: PreferClose` on Services tells kube-proxy to prefer
   endpoints in the same zone as the client pod.
4. EndpointSlice hints (set to `Auto`) let the controller populate per-zone
   hints that kube-proxy honours.

## Configuration

Apply the topology manifests:

```bash
kubectl apply -f infrastructure/k8s/topology/service-topology.yaml
kubectl apply -f infrastructure/k8s/topology/endpoint-hints.yaml
```

## Verify

```bash
# Check topology spread
kubectl describe deployment backend-deployment -n gistpin | grep -A5 Topology

# Check EndpointSlice hints
kubectl get endpointslices -n gistpin -o yaml | grep -A3 hints

# Measure cross-zone traffic reduction in CloudWatch
# Metric: AWS/EC2 NetworkOut by AZ
```

## Fallback

If the same-zone pool is exhausted, Kubernetes falls back to any available
endpoint (`whenUnsatisfiable: ScheduleAnyway` for hostname spread, cross-zone
for traffic). No requests are dropped.
