# Tagging Taxonomy

Standardized resource tagging strategy for GistPin infrastructure.

## Taxonomy Categories

| Category | Prefix | Purpose |
|----------|--------|---------|
| Automation | `gistpin:managed-by`, `gistpin:provisioner` | Provisioning metadata |
| Cost Allocation | `gistpin:cost-center`, `gistpin:project`, `gistpin:service` | Billing and cost tracking |
| Ownership | `gistpin:owner`, `gistpin:team`, `gistpin:contact-email` | Resource responsibility |
| Operational | `gistpin:tier`, `gistpin:criticality`, `gistpin:backup` | Runbook and operations |
| Security | `gistpin:data-classification`, `gistpin:compliance` | Security posture |
| Lifecycle | `gistpin:created-by`, `gistpin:decommission-date` | Resource lifecycle |

## Tier Definitions

| Tier | Name | Backup | Retention | Classification |
|------|------|--------|-----------|----------------|
| 1 | Critical | Daily | 365 days | Restricted |
| 2 | Important | Daily | 90 days | Sensitive |
| 3 | Standard | Weekly | 30 days | Internal |
| 4 | Dev/Test | None | 7 days | Public |

## Usage

Apply tier-based tags in Terraform:

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "gistpin-data"
  tags   = local.tier1_critical_tags
}
```

For service-specific tags, merge with service map:

```hcl
resource "aws_s3_bucket" "analytics" {
  bucket = "gistpin-analytics"
  tags   = merge(local.tier3_standard_tags, local.service_tags["analytics"])
}
```

## Enforcement

Tagging compliance is enforced via:
1. **Sentinel policy** – `infrastructure/terraform/tagging-taxonomy.tf` deploys the policy
2. **AWS Config rules** – `required-tags` and `gistpin-tagging-taxonomy` rules
3. **CI/CD gating** – Terraform Cloud policy checks on every plan

## Verification

```bash
# List resources missing required tags
aws resourcegroupstaggingapi get-resources --tag-filters Key=gistpin:environment

# Check Config compliance
aws configservice describe-compliance-by-config-rule --config-rule-names gistpin-tagging-taxonomy
```

## Related Resources

- [Tag Taxonomy Terraform](../terraform/tagging-taxonomy.tf)
- [Tag Locals](../terraform/tag-locals.tf)
- [Tag Policy (legacy)](../terraform/tag-policy.tf)
