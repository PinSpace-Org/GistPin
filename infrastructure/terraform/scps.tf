# ---------------------------------------------------------------------------
# Service Control Policies (SCPs)
# ---------------------------------------------------------------------------
# These policies enforce organization-wide guardrails across all member
# accounts. Start with audit-only mode (NotAction) and migrate to enforce
# mode after validation.
# ---------------------------------------------------------------------------

variable "allowed_regions" {
  description = "List of AWS regions permitted by region-restriction SCP"
  type        = list(string)
  default = [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
  ]
}

variable "scp_audit_only" {
  description = "When true, SCPs use NotAction (audit-only). Set to false for enforcement."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# 1. Deny Root User Usage
# ---------------------------------------------------------------------------
# Prevents anyone from using root account credentials in member accounts.
# This is the single most important SCP for any organization.

resource "aws_organizations_policy" "deny_root_user" {
  name        = "GistPinDenyRootUser"
  description = "Deny all actions by root user in member accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyRootUserAccess"
        Effect    = "Deny"
        Action    = "*"
        Resource  = "*"
        Condition = {
          StringLike = {
            "aws:PrincipalArn" = "arn:aws:iam::*:root"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-root-user"
    AuditOnly   = tostring(var.scp_audit_only)
  }
}

# ---------------------------------------------------------------------------
# 2. Restrict High-Risk Regions
# ---------------------------------------------------------------------------
# Limits workloads to approved regions only. Prevents accidental or
# malicious deployment to non-compliant regions.

resource "aws_organizations_policy" "restrict_regions" {
  name        = "GistPinRestrictRegions"
  description = "Restrict AWS usage to approved regions only"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonApprovedRegions"
        Effect    = "Deny"
        NotAction = [
          # Global services that must remain accessible
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
          "route53-recovery-cluster:*",
          "route53-recovery-control-config:*",
          "route53-recovery-readiness:*",
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
            "aws:RequestedRegion" = var.allowed_regions
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "restrict-regions"
    AuditOnly   = tostring(var.scp_audit_only)
  }
}

# ---------------------------------------------------------------------------
# 3. Block Dangerous IAM Actions
# ---------------------------------------------------------------------------
# Prevents modification of IAM policies, roles, and users in ways that
# could escalate privileges or weaken security controls.

resource "aws_organizations_policy" "deny_dangerous_iam" {
  name        = "GistPinDenyDangerousIAM"
  description = "Block IAM actions that could compromise security posture"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyIAMPolicyChanges"
        Effect = "Deny"
        Action = [
          "iam:CreatePolicy",
          "iam:DeletePolicy",
          "iam:CreatePolicyVersion",
          "iam:DeletePolicyVersion",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:PutRolePermissionsBoundary",
          "iam:PutUserPermissionsBoundary",
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:UpdateRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:CreateAccessKey",
          "iam:DeleteAccessKey",
          "iam:CreateLoginProfile",
          "iam:UpdateLoginProfile",
          "iam:DeleteLoginProfile",
          "iam:AddUserToGroup",
          "iam:RemoveUserFromGroup",
          "iam:CreateGroup",
          "iam:DeleteGroup",
          "iam:AttachUserPolicy",
          "iam:DetachUserPolicy",
          "iam:PutUserPolicy",
        ]
        Resource = "*"
        Condition = {
          StringNotLike = {
            # Allow Terraform/service-linked roles to manage IAM
            "aws:PrincipalArn" = [
              "arn:aws:iam::*:role/GistPinTerraformRole",
              "arn:aws:iam::*:role/aws-service-role/*",
              "arn:aws:iam::*:role/GistPinAdminRole",
            ]
          }
        }
      },
      {
        Sid    = "DenyAdminPolicyAttachment"
        Effect = "Deny"
        Action = [
          "iam:AttachRolePolicy",
          "iam:AttachUserPolicy",
          "iam:AttachGroupPolicy",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "iam:PolicyArn" = "arn:aws:iam::aws:policy/AdministratorAccess"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-dangerous-iam"
    AuditOnly   = tostring(var.scp_audit_only)
  }
}

# ---------------------------------------------------------------------------
# 4. Prevent Billing Modification
# ---------------------------------------------------------------------------
# Blocks member accounts from modifying billing, cost explorer, budgets,
# and payment methods. Only the management account should handle billing.

resource "aws_organizations_policy" "deny_billing_modification" {
  name        = "GistPinDenyBillingModification"
  description = "Prevent member accounts from modifying billing and cost settings"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyBillingChanges"
        Effect = "Deny"
        Action = [
          "account:PutContactInformation",
          "account:PutAlternateContact",
          "account:DeleteAlternateContact",
          "budgets:CreateBudget",
          "budgets:DeleteBudget",
          "budgets:ModifyBudget",
          "budgets:UpdateBudget",
          "ce:CreateCostCategoryDefinition",
          "ce:DeleteCostCategoryDefinition",
          "ce:UpdateCostCategoryDefinition",
          "pricing:PutRegionServiceDiscount",
          "organizations:LeaveOrganization",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyPaymentMethodChanges"
        Effect = "Deny"
        Action = [
          "aws-portal:ModifyAccount",
          "aws-portal:UpdatePaymentMethods",
          "aws-portal:ViewPaymentMethods",
          "billing:DeleteAlternateContact",
          "billing:PutAlternateContact",
          "billing:UpdateBillingPreferences",
          "consolidatedbilling:PutAlternateContact",
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyCostExplorerAdmin"
        Effect = "Deny"
        Action = [
          "ce:CreateAnomalyMonitor",
          "ce:CreateAnomalySubscription",
          "ce:DeleteAnomalyMonitor",
          "ce:DeleteAnomalySubscription",
          "ce:UpdateAnomalyMonitor",
          "ce:UpdateAnomalySubscription",
        ]
        Resource = "*"
        Condition = {
          StringNotLike = {
            "aws:PrincipalArn" = [
              "arn:aws:iam::*:role/GistPinTerraformRole",
              "arn:aws:iam::*:role/GistPinCostAdminRole",
            ]
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-billing-modification"
    AuditOnly   = tostring(var.scp_audit_only)
  }
}

# ---------------------------------------------------------------------------
# 5. Deny Leave Organization
# ---------------------------------------------------------------------------
# Prevents any member account from voluntarily leaving the organization.

resource "aws_organizations_policy" "deny_leave_org" {
  name        = "GistPinDenyLeaveOrg"
  description = "Prevent member accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyLeaveOrganization"
        Effect   = "Deny"
        Action   = "organizations:LeaveOrganization"
        Resource = "*"
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-leave-organization"
  }
}

# ---------------------------------------------------------------------------
# 6. Enforce IMDSv2
# ---------------------------------------------------------------------------
# Requires all EC2 instances to use Instance Metadata Service v2,
# preventing SSRF-based credential theft.

resource "aws_organizations_policy" "enforce_imdsv2" {
  name        = "GistPinEnforceIMDSv2"
  description = "Require IMDSv2 on all EC2 instances"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceIMDSv2"
        Effect    = "Deny"
        Action    = "ec2:RunInstances"
        Resource  = "*"
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "enforce-imdsv2"
  }
}

# ---------------------------------------------------------------------------
# 7. Deny S3 Public Access
# ---------------------------------------------------------------------------
# Prevents any S3 bucket from being made publicly accessible.

resource "aws_organizations_policy" "deny_s3_public" {
  name        = "GistPinDenyS3PublicAccess"
  description = "Prevent S3 buckets from being made public"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyPublicBucketPolicy"
        Effect = "Deny"
        Action = [
          "s3:PutBucketPublicAccessBlock",
          "s3:PutAccountPublicAccessBlock",
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "s3:PublicAccessBlockConfiguration/BlockPublicAcls"       = "true"
            "s3:PublicAccessBlockConfiguration/BlockPublicPolicy"    = "true"
            "s3:PublicAccessBlockConfiguration/IgnorePublicAcls"     = "true"
            "s3:PublicAccessBlockConfiguration/RestrictPublicBuckets" = "true"
          }
        }
      },
      {
        Sid    = "DenyPublicBucketAcl"
        Effect = "Deny"
        Action = [
          "s3:PutBucketAcl",
          "s3:PutObjectAcl",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = [
              "public-read",
              "public-read-write",
              "authenticated-read",
            ]
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-s3-public-access"
  }
}

# ---------------------------------------------------------------------------
# 8. Deny Security Group Open Access
# ---------------------------------------------------------------------------
# Prevents security groups from being configured with unrestricted ingress.

resource "aws_organizations_policy" "deny_open_security_groups" {
  name        = "GistPinDenyOpenSecurityGroups"
  description = "Prevent security groups from allowing unrestricted ingress"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyOpenIngress"
        Effect = "Deny"
        Action = [
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:CreateSecurityGroup",
        ]
        Resource = "*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = "0.0.0.0/0"
          }
        }
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-open-security-groups"
  }
}

# ---------------------------------------------------------------------------
# 9. Deny CloudTrail Tampering
# ---------------------------------------------------------------------------
# Prevents disabling or modifying CloudTrail logging, ensuring audit
# trail integrity.

resource "aws_organizations_policy" "deny_cloudtrail_tampering" {
  name        = "GistPinDenyCloudTrailTampering"
  description = "Prevent modification or deletion of CloudTrail configurations"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyCloudTrailModification"
        Effect = "Deny"
        Action = [
          "cloudtrail:StopLogging",
          "cloudtrail:DeleteTrail",
          "cloudtrail:PutEventSelectors",
          "cloudtrail:UpdateTrail",
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "deny-cloudtrail-tampering"
  }
}
