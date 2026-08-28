# KEDA Queue-Based Pod Autoscaling

## Overview

The **Indexer** deployment scales horizontally based on the depth of the
`gistpin-indexer-queue` SQS queue using [KEDA](https://keda.sh/) (Kubernetes Event-Driven
Autoscaling). As queue depth grows, KEDA increases the number of Indexer pods; as the
queue drains, pods are scaled down after a cooldown period.

## Architecture

```
SQS Queue (gistpin-indexer-queue)
        │
        │  GetQueueAttributes
        ▼
  KEDA Operator ──────────────────► HPA
        │                            │
        │  scale decision            │  adjust replicas
        ▼                            ▼
  Indexer Deployment (1–20 pods)
```

## Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `minReplicaCount` | 1 | Always keep at least one pod running |
| `maxReplicaCount` | 20 | Hard ceiling on pod count |
| `cooldownPeriod` | 300 s | Wait 5 min after last scale before scaling down |
| `pollingInterval` | 15 s | How often KEDA checks queue depth |
| `queueLength` | 10 | Target messages per pod (scaling ratio) |

### Scaling Formula

```
desiredReplicas = ceil(queueDepth / queueLength)
                = ceil(queueDepth / 10)
```

Examples:

| Queue depth | Desired pods (clamped to 1–20) |
|-------------|-------------------------------|
| 0 | 1 (idleReplicaCount) |
| 25 | 3 |
| 100 | 10 |
| 250 | 20 (max) |

## Files

| File | Purpose |
|------|---------|
| `indexer-scaledobject.yaml` | KEDA `ScaledObject` – links the Deployment to the SQS trigger |
| `queue-metric-trigger.yaml` | `TriggerAuthentication` + `ConfigMap` for AWS credentials |

## Prerequisites

1. **KEDA installed** in the cluster:
   ```bash
   helm repo add kedacore https://kedacore.github.io/charts
   helm install keda kedacore/keda --namespace keda --create-namespace
   ```

2. **IAM permissions** – The KEDA operator's IAM role (via IRSA) must have:
   - `sqs:GetQueueAttributes`
   - `sqs:GetQueueUrl`

3. **IRSA annotation** on the KEDA operator's service account:
   ```bash
   kubectl annotate serviceaccount keda-operator \
     -n keda \
     eks.amazonaws.com/role-arn=arn:aws:iam::ACCOUNT_ID:role/keda-sqs-reader
   ```

## Deployment

```bash
# Apply authentication config first
kubectl apply -f infrastructure/k8s/keda/queue-metric-trigger.yaml

# Apply the ScaledObject
kubectl apply -f infrastructure/k8s/keda/indexer-scaledobject.yaml

# Verify KEDA picked up the ScaledObject
kubectl get scaledobject -n gistpin
kubectl describe scaledobject indexer-scaledobject -n gistpin
```

## Monitoring

```bash
# Watch HPA events driven by KEDA
kubectl get hpa -n gistpin -w

# Check KEDA operator logs for scaling decisions
kubectl logs -n keda -l app=keda-operator --tail=50 -f

# Current queue depth (AWS CLI)
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/gistpin-indexer-queue \
  --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible
```

## References

- [KEDA SQS Scaler documentation](https://keda.sh/docs/scalers/aws-sqs/)
- [KEDA TriggerAuthentication](https://keda.sh/docs/concepts/authentication/)
- [AWS IRSA for EKS](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
