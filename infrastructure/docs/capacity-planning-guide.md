# Capacity Planning Guide

## Overview

GistPin provides an automated capacity planning pipeline that collects real-time Kubernetes utilisation baselines, projects growth using configurable rates, and produces node scaling recommendations with cost impact analysis.

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| Capacity Planner | `infrastructure/scripts/capacity-planner.py` | CLI tool that queries K8s metrics and projects capacity needs |
| Prometheus Recording Rules | `infrastructure/monitoring/capacity-metrics.yml` | Pre-aggregated metrics for dashboards and alerting |
| Existing Forecast Tool | `infrastructure/scripts/forecast-usage.py` | CloudWatch-based usage forecasting |
| Existing Capacity Analysis | `infrastructure/scripts/capacity-analysis.sh` | AWS resource trend collection |

## Quick Start

### Prerequisites

```bash
pip install boto3 kubernetes
```

Ensure your kubeconfig is configured for the target cluster:

```bash
aws eks update-kubeconfig --name gistpin --region us-east-1
```

### Running the Capacity Planner

```bash
# Default analysis (5% monthly growth, 90-day forecast)
python3 infrastructure/scripts/capacity-planner.py

# Custom growth rate and forecast window
python3 infrastructure/scripts/capacity-planner.py \
  --growth-rate 10 \
  --forecast-days 180

# JSON output for automation
python3 infrastructure/scripts/capacity-planner.py --output json

# Custom node cost estimate
python3 infrastructure/scripts/capacity-planner.py --cost-per-hour 0.05
```

### CLI Reference

| Flag | Default | Description |
|------|---------|-------------|
| `--cluster` | `gistpin` | EKS cluster name |
| `--namespace` | `gistpin` | Kubernetes namespace to analyse |
| `--growth-rate` | `5.0` | Monthly growth rate (%) |
| `--forecast-days` | `90` | Days to project ahead |
| `--cost-per-hour` | `0.042` | Hourly cost per node (USD) |
| `--output` | `text` | Output format: `text` or `json` |

## Utilisation Thresholds

| Resource | Warning | Critical | Action |
|----------|---------|----------|--------|
| CPU | > 70% | > 85% | Scale node group |
| Memory | > 75% | > 90% | Increase instance type or add nodes |
| Storage | > 75% | > 90% | Expand PV or add storage class |
| Pods | > 80% | > 95% | Increase `maxPods` or add nodes |

## Scaling Procedures

### Horizontal Pod Autoscaling

HPA is configured for backend (2-10 replicas) and frontend (2-6 replicas) workloads. Adjust limits:

```bash
# Update HPA limits
kubectl patch hpa backend-hpa -n gistpin \
  --type='json' \
  -p='[{"op":"replace","path":"/spec/maxReplicas","value":15}]'
```

### Node Group Scaling (EKS)

Update `infrastructure/terraform/eks-node-groups.tf` and apply:

```bash
terraform plan -target=aws_eks_node_group.app
terraform apply -target=aws_eks_node_group.app
```

### Vertical Pod Autoscaling (VPA)

VPA recommendations are available for review:

```bash
kubectl get vpa -n gistpin
kubectl describe vpa backend-vpa -n gistpin
```

Apply recommended values to deployment resource requests:

```bash
kubectl patch deployment backend -n gistpin --type='json' \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/requests/cpu","value":"350m"}]'
```

## Prometheus Metrics

The recording rules in `capacity-metrics.yml` pre-aggregate:

- **Cluster CPU/Memory request ratios** (5m and 1h windows)
- **Per-node pod density**
- **Namespace-level resource consumption**
- **Capacity headroom per node**

These feed Grafana dashboards and alerting rules.

### Key PromQL Queries

```promql
# Cluster CPU request ratio
sum(kube_pod_container_resource_requests{resource="cpu"}) /
  sum(kube_node_status_allocatable{resource="cpu"})

# Cluster memory request ratio
sum(kube_pod_container_resource_requests{resource="memory"}) /
  sum(kube_node_status_allocatable{resource="memory"})

# Available pod slots per node
kube_node_status_allocatable{resource="pods"} -
  count(kube_pod_info) by (node)

# CPU headroom per node (cores free)
kube_node_status_allocatable{resource="cpu"} -
  sum(kube_pod_container_resource_requests{resource="cpu"}) by (node)
```

## Cost Implications

The planner estimates cost based on:

- **Hourly node cost** (configurable, defaults to t3.medium on-demand)
- **730 hours/month** billing cycle
- **Recommended node count** derived from the most aggressive scaling threshold

Example output:

```
--- Cost Implications ---
  Current:  $30.66/mo
  Projected: $45.99/mo
  Delta:     $15.33/mo (+50.0%)
```

### Cost Optimisation Strategies

1. **Reserved Instances**: Purchase 1-year RIs for stable baseline capacity (up to 40% savings)
2. **Spot Instances**: Use spot for non-critical workloads (up to 70% savings)
3. **Right-sizing**: Use VPA recommendations to right-size pod requests
4. **Cluster Autoscaler**: Pair with Karpenter for dynamic node provisioning

## Scheduling

| Cadence | Activity |
|---------|----------|
| Weekly | Automated capacity planner run via CI cron |
| Monthly | Review forecast output, update Terraform node groups |
| Quarterly | Full capacity review with 6-month projections and cost optimisation |

## Troubleshooting

### "metrics.k8s.io" not available

The planner falls back to pod requests if the metrics-server API is unavailable. Ensure metrics-server is running:

```bash
kubectl get deployment metrics-server -n kube-system
```

### No nodes returned

Verify kubeconfig context points to the correct cluster:

```bash
kubectl config current-context
kubectl get nodes
```

### Cost estimates seem off

Adjust `--cost-per-hour` to match your actual pricing (reserved, spot, etc.):

```bash
# Spot pricing example
python3 infrastructure/scripts/capacity-planner.py --cost-per-hour 0.013
```
