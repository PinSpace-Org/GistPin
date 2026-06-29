# Resource Tuning with Goldilocks

## Overview

Goldilocks provides resource recommendations based on historical usage data collected by VPA. It helps right-size Kubernetes workloads for cost optimization and performance.

## Architecture

Goldilocks consists of two components:

- **Controller**: Watches namespaces with the `goldilocks.fairwinds.com/enabled: "true"` label and creates VPAs for each workload
- **Dashboard**: Web UI for viewing recommendations across namespaces

## Enabling Goldilocks for a Namespace

```bash
kubectl label namespace <namespace> goldilocks.fairwinds.com/enabled="true"
```

## Accessing the Dashboard

The Goldilocks dashboard is available at `https://goldilocks.gistpin.io`.

### Dashboard Features
- View resource recommendations per deployment
- Filter by namespace
- Export recommendations
- View historical trends

## VPA Recommendation Mode

Goldilocks creates VPAs in `Off` mode (recommendation only). This means:

- VPAs do not automatically adjust resources
- Recommendations appear in VPA status
- Apply recommendations manually after review

### Viewing Recommendations via CLI

```bash
# For a specific deployment
kubectl get vpa goldilocks-backend-vpa -n gistpin -o yaml

# Extract target recommendations
kubectl get vpa goldilocks-backend-vpa -n gistpin \
  -o json | jq '.status.recommendation.containerRecommendations'
```

## Applying Recommendations

### Manual Apply

```bash
bash infrastructure/scripts/apply-right-sizing.sh --namespace gistpin
```

### Automated Apply (Staging Only)

For staging environments, recommendations can be auto-applied:

```bash
MODE=apply ENVIRONMENT=staging bash infrastructure/scripts/apply-vpa-recommendations.sh
```

## Recommendation Tiers

| Tier | CPU Request | Memory Request | Description |
|------|-------------|----------------|-------------|
| Burstable | 25m-100m | 64Mi-256Mi | Low-traffic services |
| Standard | 100m-500m | 256Mi-1Gi | Medium-traffic services |
| Performance | 500m-2 | 1Gi-4Gi | High-traffic services |
| Critical | 2+ | 4Gi+ | Core platform services |

## Cost Optimization

Goldilocks recommendations help identify over-provisioned resources:

```bash
# Compare current requests vs recommendations
kubectl get vpa goldilocks-backend-vpa -n gistpin \
  -o json | jq '{current: .status.recommendation.containerRecommendations[0].target, lower: .status.recommendation.containerRecommendations[0].lowerBound, upper: .status.recommendation.containerRecommendations[0].upperBound}'
```

### Example Savings

| Workload | Current | Recommended | Monthly Savings |
|----------|---------|-------------|-----------------|
| backend | 1CPU/2Gi | 250m/512Mi | ~$45/instance |
| frontend | 500m/1Gi | 125m/256Mi | ~$25/instance |

## Best Practices

1. Run Goldilocks for 7+ days before applying recommendations
2. Review recommendations during off-peak hours
3. Apply changes gradually (25% of workloads at a time)
4. Monitor application performance after applying changes
5. Use HPA alongside VPA recommendations
6. Re-check recommendations quarterly

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| No recommendations showing | Ensure namespace has `goldilocks.fairwinds.com/enabled: "true"` label |
| Dashboard unreachable | Check ingress and goldilocks-dashboard pod logs |
| VPA not created | Check goldilocks-controller logs: `kubectl logs -n goldilocks deploy/goldilocks-controller` |
| Recommendations incomplete | Ensure metrics-server is installed and collecting data |
