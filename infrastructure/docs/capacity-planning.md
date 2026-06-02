# Capacity Planning

## Overview

GistPin uses automated capacity analysis and 90-day usage forecasting to proactively scale infrastructure before resource constraints impact users.

## Tools

| Script | Purpose |
|--------|---------|
| `capacity-analysis.sh` | Collect CPU, memory, storage, and connection trends from CloudWatch |
| `forecast-usage.py` | Linear regression forecast with scale-up/down recommendations |

## Running Analysis

```bash
# Analyse last 30 days
LOOKBACK_DAYS=30 ./infrastructure/scripts/capacity-analysis.sh

# 90-day forecast (text output)
python3 infrastructure/scripts/forecast-usage.py --region us-east-1 --forecast-days 90

# JSON output for automation
python3 infrastructure/scripts/forecast-usage.py --output json
```

## Thresholds and Actions

| Resource | Warning | Action |
|----------|---------|--------|
| Node CPU | > 70% avg | Add EKS node group |
| Node Memory | > 75% avg | Increase node instance type |
| RDS Connections | > 80% max | Enable RDS Proxy or scale instance |
| RDS Free Storage | < 20 GB | Increase allocated storage |

## Scaling Procedures

### EKS Horizontal Scaling
HPA is configured for backend (2–10 replicas) and frontend (2–6 replicas). Adjust limits in `infrastructure/k8s/hpa-backend.yaml` and `hpa-frontend.yaml`.

### EKS Vertical Scaling (node groups)
Update `infrastructure/terraform/eks-node-groups.tf` and apply:
```bash
terraform apply -target=aws_eks_node_group.gistpin_nodes
```

### RDS Storage Auto-scaling
Enabled by default with a 1 TB ceiling. To raise the ceiling:
```bash
aws rds modify-db-instance --db-instance-identifier gistpin-db \
  --max-allocated-storage 2000
```

## Schedule

- **Weekly**: automated capacity-analysis.sh run via CI cron
- **Monthly**: review forecast-usage.py output and update Terraform if needed
- **Quarterly**: full capacity review with 6-month projections
