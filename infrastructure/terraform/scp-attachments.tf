# ---------------------------------------------------------------------------
# SCP Attachments
# ---------------------------------------------------------------------------
# Attach SCPs to organizational units or the organization root.
# Policies attached to the root apply to ALL member accounts.
# Policies attached to an OU apply only to accounts within that OU.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Organization Root Attachments (applies to ALL member accounts)
# ---------------------------------------------------------------------------

# Prevent root user access in all member accounts
resource "aws_organizations_policy_attachment" "deny_root_user" {
  policy_id = aws_organizations_policy.deny_root_user.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Prevent accounts from leaving the organization
resource "aws_organizations_policy_attachment" "deny_leave_org" {
  policy_id = aws_organizations_policy.deny_leave_org.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Prevent billing modifications in all member accounts
resource "aws_organizations_policy_attachment" "deny_billing_modification" {
  policy_id = aws_organizations_policy.deny_billing_modification.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Enforce IMDSv2 on all EC2 instances
resource "aws_organizations_policy_attachment" "enforce_imdsv2" {
  policy_id = aws_organizations_policy.enforce_imdsv2.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Deny S3 public access across all accounts
resource "aws_organizations_policy_attachment" "deny_s3_public" {
  policy_id = aws_organizations_policy.deny_s3_public.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Deny open security groups across all accounts
resource "aws_organizations_policy_attachment" "deny_open_security_groups" {
  policy_id = aws_organizations_policy.deny_open_security_groups.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# Deny CloudTrail tampering across all accounts
resource "aws_organizations_policy_attachment" "deny_cloudtrail_tampering" {
  policy_id = aws_organizations_policy.deny_cloudtrail_tampering.id
  target_id = aws_organizations_organization.gistpin.roots[0].id
}

# ---------------------------------------------------------------------------
# Workloads OU Attachments (applies to dev/staging/prod accounts)
# ---------------------------------------------------------------------------

# Restrict regions only for workload accounts (not security/logging/shared)
resource "aws_organizations_policy_attachment" "restrict_regions_workloads" {
  policy_id = aws_organizations_policy.restrict_regions.id
  target_id = aws_organizations_ou.workloads.id
}

# Block dangerous IAM actions in workload accounts
resource "aws_organizations_policy_attachment" "deny_dangerous_iam_workloads" {
  policy_id = aws_organizations_policy.deny_dangerous_iam.id
  target_id = aws_organizations_ou.workloads.id
}

# ---------------------------------------------------------------------------
# Production OU Attachments (stricter controls for prod)
# ---------------------------------------------------------------------------

# Additional region restrictions for production (single region)
resource "aws_organizations_policy" "prod_region_lock" {
  name        = "GistPinProdRegionLock"
  description = "Lock production to us-east-1 only"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonProdRegions"
        Effect    = "Deny"
        NotAction = [
          "a4b:*",
          "acm:*",
          "aws-marketplace-management:*",
          "aws-marketplace:*",
          "budgets:*",
          "ce:*",
          "chime:*",
          "cloudfront:*",
          "cur:*",
          "globalaccelerator:*",
          "health:*",
          "iam:*",
          "importexport:*",
          "kms:*",
          "mobileanalytics:*",
          "organizations:*",
          "pricing:*",
          "route53:*",
          "route53domains:*",
          "s3:GetBucketLocation",
          "s3:ListAllMyBuckets",
          "shield:*",
          "sts:*",
          "support:*",
          "trustedadvisor:*",
          "waf:*",
          "waf-regional:*",
          "wafv2:*",
          "wellarchitected:*",
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = "us-east-1"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "prod-region-lock"
  }
}

resource "aws_organizations_policy_attachment" "prod_region_lock" {
  policy_id = aws_organizations_policy.prod_region_lock.id
  target_id = aws_organizations_ou.workloads_prod.id
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "scp_ids" {
  description = "Map of SCP names to their IDs"
  value = {
    deny_root_user           = aws_organizations_policy.deny_root_user.id
    restrict_regions         = aws_organizations_policy.restrict_regions.id
    deny_dangerous_iam       = aws_organizations_policy.deny_dangerous_iam.id
    deny_billing_modification = aws_organizations_policy.deny_billing_modification.id
    deny_leave_org           = aws_organizations_policy.deny_leave_org.id
    enforce_imdsv2           = aws_organizations_policy.enforce_imdsv2.id
    deny_s3_public           = aws_organizations_policy.deny_s3_public.id
    deny_open_security_groups = aws_organizations_policy.deny_open_security_groups.id
    deny_cloudtrail_tampering = aws_organizations_policy.deny_cloudtrail_tampering.id
    prod_region_lock         = aws_organizations_policy.prod_region_lock.id
  }
}

output "scp_attachment_count" {
  description = "Total number of SCP attachments"
  value       = 10
}
