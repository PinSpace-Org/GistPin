# Chaos Engineering

Automated chaos experiments for GistPin to validate resilience and recovery.

## Experiments

| Experiment | Script | Description |
|------------|--------|-------------|
| `pod-failure` | `chaos-tests/pod-failure.sh` | Delete a random pod; validate K8s self-healing |
| `network-latency` | `chaos-tests/network-latency.sh` | Inject network latency via `tc netem` |
| `resource-exhaustion` | `chaos-tests/resource-exhaustion.sh` | CPU/memory stress on a running pod |
| `failover` | `chaos-tests/failover.sh` | Scale deployment to 0 and restore |

## Usage

```bash
# Run a specific experiment
NAMESPACE=gistpin DURATION=60 bash infrastructure/scripts/run-chaos-experiment.sh pod-failure

# Available experiments
bash infrastructure/scripts/run-chaos-experiment.sh <experiment>
# pod-failure | network-latency | resource-exhaustion | failover
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NAMESPACE` | `gistpin` | Kubernetes namespace |
| `DURATION` | `60` | Experiment duration in seconds |
| `LATENCY` | `200ms` | Latency for network-latency experiment |
| `DEPLOYMENT` | `backend` | Deployment name for failover experiment |

## Recovery Validation

Each experiment logs pass/fail based on pod count and rollout status after the chaos window. Review stdout for `PASS` / `WARN` indicators.
