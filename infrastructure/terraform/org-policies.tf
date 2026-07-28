resource "aws_organizations_policy" "deny_root_user" {
  name        = "GistPinDenyRootUser"
  description = "Prevent root user access across all member accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyRootUser"
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
}

resource "aws_organizations_policy" "deny_leave_organization" {
  name        = "GistPinDenyLeaveOrg"
  description = "Prevent member accounts from leaving the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyLeaveOrganization"
        Effect   = "Deny"
        Action   = [
          "organizations:LeaveOrganization",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_organizations_policy" "enforce_imdsv2" {
  name        = "GistPinEnforceIMDSv2"
  description = "Require IMDSv2 on all EC2 instances across the organization"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyEC2WithoutIMDSv2"
        Effect   = "Deny"
        Action   = "ec2:RunInstances"
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      },
      {
        Sid      = "DenyModifyIMDSSettings"
        Effect   = "Deny"
        Action   = [
          "ec2:ModifyInstanceMetadataOptions",
        ]
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringNotEquals = {
            "ec2:MetadataHttpTokens" = "required"
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy" "enforce_encryption" {
  name        = "GistPinEnforceEncryption"
  description = "Require encryption for S3 buckets and EBS volumes"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyUnencryptedS3"
        Effect   = "Deny"
        Action   = "s3:PutBucketPolicy"
        Resource = "arn:s3:::*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid      = "DenyUnencryptedEBS"
        Effect   = "Deny"
        Action   = "ec2:CreateVolume"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "ec2:Encrypted" = "true"
          }
        }
      }
    ]
  })
}

resource "aws_organizations_policy" "restrict_regions" {
  name        = "GistPinRestrictRegions"
  description = "Restrict workloads to approved regions only"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "DenyNonApprovedRegions"
        Effect   = "Deny"
        NotAction = [
          "a4b:*",
          "budgets:*",
          "ce:*",
          "chime:*",
          "cloudfront:*",
          "globalaccelerator:*",
          "health:*",
          "iam:*",
          "importexport:*",
          "route53:*",
          "route53domains:*",
          "route53-recovery-cluster:*",
          "route53-recovery-control-config:*",
          "route53-recovery-readiness:*",
          "sts:*",
          "support:*",
          "trustedadvisor:*",
          "waf-regional:*",
          "waf:*",
          "wafv2:*",
          "wellarchitected:*",
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:RequestedRegion" = [
              "us-east-1",
              "us-west-2",
              "eu-west-1",
            ]
          }
        }
      }
    ]
  })
}

# ---------------------------------------------------------------------------
# Policy Attachments
# ---------------------------------------------------------------------------

locals {
  org_policy_attachments = {
    "deny_root_user"          = aws_organizations_policy.deny_root_user.id
    "deny_leave_organization" = aws_organizations_policy.deny_leave_organization.id
    "enforce_imdsv2"          = aws_organizations_policy.enforce_imdsv2.id
    "enforce_encryption"      = aws_organizations_policy.enforce_encryption.id
  }

  root_id = data.aws_organizations_organization.gistpin.roots[0].id
}

data "aws_organizations_organization" "gistpin" {}

resource "aws_organizations_policy_attachment" "root_policies" {
  for_each = local.org_policy_attachments

  policy_id = each.value
  target_id = data.aws_organizations_organization.gistpin.roots[0].id
}

resource "aws_organizations_policy_attachment" "workloads_region_restriction" {
  policy_id = aws_organizations_policy.restrict_regions.id
  target_id = aws_organizations_ou.workloads.id
}
