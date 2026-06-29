# Egress Cost Tracking

Track and attribute network egress costs across GistPin services using VPC flow logs.

## Methodology

Egress costs are tracked using three complementary approaches:

1. **VPC Flow Logs** — Captured at the VPC and subnet level, stored in S3 as Parquet files
2. **Prometheus Recording Rules** — Per-service bandwidth and cost metrics computed from `container_network_transmit_bytes_total`
3. **Cost Attribution Script** — Analyzes flow logs to attribute costs by destination and detect cross-region transfers

## Architecture

```
VPC Flow Logs → S3 (Parquet, encrypted)
    ↓
egress-cost-tracker.sh
    ↓
Cost Attribution Report
    ↓
Prometheus Alert Rules → Notifications
```

## Flow Log Analysis

VPC flow logs are configured in `infrastructure/terraform/vpc-flow-logs.tf`:

| Setting | Value |
|---------|-------|
| Destination | S3 bucket (`gistpin-{env}-flow-logs`) |
| Format | Parquet with hourly partitioning |
| Traffic filter | ALL (ACCEPT and REJECT) |
| Aggregation interval | 60 seconds |
| Retention | 365 days (90d → Glacier IR, 180d → Deep Archive) |

## Cost Attribution

The `egress-cost-tracker.sh` script performs the following:

1. Queries VPC flow logs from the last hour via CloudWatch Logs
2. Calculates GB transferred per destination category (internet vs cross-VPC)
3. Applies AWS egress pricing ($0.09/GB baseline for us-east-1)
4. Detects cross-region transfers exceeding a configurable threshold
5. Generates a cost attribution report with top source IPs

```bash
# Run egress cost analysis
bash infrastructure/scripts/egress-cost-tracker.sh

# Override defaults
AWS_REGION=us-west-2 LOG_GROUP=/custom/flow-logs \
  bash infrastructure/scripts/egress-cost-tracker.sh
```

## Cost Attribution Formula

```
Egress Cost = Total GB Transferred × Region Rate

Region rates (as of 2025):
- us-east-1: $0.09/GB (first 10 TB)
- Cross-region: $0.02/GB (within same continent)
- Cross-region: $0.09/GB (between continents)
- Internet: $0.09/GB
```

## Alerting

| Alert | Threshold | Severity | Action |
|-------|-----------|----------|--------|
| `EgressCostAnomaly` | > $100/day | warning | Review top consumers |
| `EgressCostCritical` | > $500/day | critical | Immediate investigation |
| `UnexpectedEgressSpike` | > 2x baseline | warning | Check for data exfiltration |
| `CrossRegionTransferWarning` | > 50 MiB/s sustained | warning | Optimize data locality |
| `ServiceEgressAnomaly` | > 3x 6h baseline | warning | Review service configuration |

## Cost Optimization Recommendations

- Use VPC Gateway Endpoints for S3 and DynamoDB to avoid NAT/Internet egress costs
- Consolidate cross-region traffic with Direct Connect or Transit Gateway
- Move large data transfers to off-peak hours
- Enable S3 Transfer Acceleration for large uploads
- Review top egress sources weekly using the cost attribution report
