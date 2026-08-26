# Multi-Cloud Cost Comparison

## Overview

Compare infrastructure costs across AWS, GCP, and Azure for equivalent services. The comparison tool collects billing data, maps equivalent services, and generates a TCO (Total Cost of Ownership) analysis.

## Service Mapping

| Category       | AWS                    | GCP                    | Azure                   |
|----------------|------------------------|------------------------|-------------------------|
| Compute        | EC2/EKS                | GCE/GKE                | VMs/AKS                 |
| Object Storage | S3                     | Cloud Storage          | Blob Storage            |
| Database       | RDS/Aurora             | Cloud SQL              | Azure SQL               |
| CDN            | CloudFront             | Cloud CDN              | Azure CDN               |
| DNS            | Route 53               | Cloud DNS              | Azure DNS               |
| Load Balancer  | ALB/NLB                | Cloud Load Balancer    | Azure LB                |
| Functions      | Lambda                 | Cloud Functions        | Azure Functions         |
| Message Queue  | SQS/SNS                | Pub/Sub                | Service Bus             |

## Usage

```bash
# Collect costs from all clouds
./infrastructure/scripts/multi-cloud-costs.sh

# Specify region
./infrastructure/scripts/multi-cloud-costs.sh --region us-west-2

# Custom output directory
./infrastructure/scripts/multi-cloud-costs.sh --output-dir reports/
```

## Required Credentials

### AWS
```bash
aws configure
# or export AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

### GCP
```bash
export GCP_PROJECT_ID="your-project-id"
gcloud auth login
```

### Azure
```bash
export AZURE_SUBSCRIPTION_ID="your-subscription-id"
az login
```

## Report Format

The JSON report includes:
- Per-cloud monthly and annual costs
- Service-level cost breakdown
- TCO summary
- Equivalent service mapping

## Migration Cost Estimate

When considering cloud migration, use the TCO comparison to estimate:
1. **Compute migration**: EC2 → GCE/Azure VM cost delta
2. **Storage migration**: S3 → Cloud Storage/Blob cost delta
3. **Database migration**: RDS → Cloud SQL/Azure SQL cost delta

## Grafana Dashboard

The `multi-cloud-costs.json` dashboard provides:
- Total cost by provider (bar gauge)
- Cost breakdown by service (pie chart)
- Monthly cost trend (3 months)
- Per-category cost comparison (compute, storage, database)
- TCO estimate (stat panel)

## Best Practices

1. Run cost comparison monthly for trend analysis
2. Factor in egress costs when comparing providers
3. Consider reserved/committed use discounts
4. Include operational overhead in TCO calculations
5. Review service mapping for accuracy before migration planning
