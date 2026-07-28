variable "org_name" {
  description = "Name of the AWS Organization"
  type        = string
  default     = "gistpin-org"
}

variable "master_account_email" {
  description = "Email for the organization management account"
  type        = string
}

variable "security_account_email" {
  description = "Email for the security sub-account"
  type        = string
}

variable "logging_account_email" {
  description = "Email for the logging sub-account"
  type        = string
}

variable "shared_services_account_email" {
  description = "Email for the shared services sub-account"
  type        = string
}

variable "environment_accounts" {
  description = "Map of environment name to email for per-environment accounts"
  type        = map(string)
  default = {
    dev     = "dev-gistpin@example.com"
    staging = "staging-gistpin@example.com"
    prod    = "prod-gistpin@example.com"
  }
}

# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------

resource "aws_organizations_organization" "gistpin" {
  feature_set = "ALL"

  aws_service_access_principals = [
    "cloudtrail.amazonaws.com",
    "config.amazonaws.com",
    "sso.amazonaws.com",
    "guardduty.amazonaws.com",
    "securityhub.amazonaws.com",
  ]
}

# ---------------------------------------------------------------------------
# Organizational Units
# ---------------------------------------------------------------------------

resource "aws_organizations_ou" "security" {
  name      = "security"
  parent_id = aws_organizations_organization.gistpin.roots[0].id
}

resource "aws_organizations_ou" "logging" {
  name      = "logging"
  parent_id = aws_organizations_organization.gistpin.roots[0].id
}

resource "aws_organizations_ou" "shared_services" {
  name      = "shared-services"
  parent_id = aws_organizations_organization.gistpin.roots[0].id
}

resource "aws_organizations_ou" "workloads" {
  name      = "workloads"
  parent_id = aws_organizations_organization.gistpin.roots[0].id
}

resource "aws_organizations_ou" "workloads_dev" {
  name      = "dev"
  parent_id = aws_organizations_ou.workloads.id
}

resource "aws_organizations_ou" "workloads_staging" {
  name      = "staging"
  parent_id = aws_organizations_ou.workloads.id
}

resource "aws_organizations_ou" "workloads_prod" {
  name      = "prod"
  parent_id = aws_organizations_ou.workloads.id
}

# ---------------------------------------------------------------------------
# Member Accounts
# ---------------------------------------------------------------------------

resource "aws_organizations_account" "security" {
  name      = "gistpin-security"
  email     = var.security_account_email
  parent_id = aws_organizations_ou.security.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "logging" {
  name      = "gistpin-logging"
  email     = var.logging_account_email
  parent_id = aws_organizations_ou.logging.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "shared_services" {
  name      = "gistpin-shared-services"
  email     = var.shared_services_account_email
  parent_id = aws_organizations_ou.shared_services.id

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_organizations_account" "environment" {
  for_each = var.environment_accounts

  name      = "gistpin-${each.key}"
  email     = each.value
  parent_id = lookup(
    {
      "dev"     = aws_organizations_ou.workloads_dev.id
      "staging" = aws_organizations_ou.workloads_staging.id
      "prod"    = aws_organizations_ou.workloads_prod.id
    },
    each.key,
    aws_organizations_ou.workloads_dev.id
  )

  lifecycle {
    prevent_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Cross-Account Access Roles
# ---------------------------------------------------------------------------

data "aws_iam_policy_document" "organization_assume_role" {
  statement {
    effect = "Allow"
    actions = [
      "sts:AssumeRole",
      "sts:AssumeRoleWithSAML",
    ]

    principals {
      type        = "AWS"
      identifiers = [aws_organizations_organization.gistpin.master_account_id]
    }
  }

  statement {
    effect = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "AWS"
      identifiers = [aws_organizations_account.security.id]
    }

    condition {
      test     = "StringEquals"
      variable = "sts:ExternalId"
      values   = ["gistpin-security-audit"]
    }
  }
}

resource "aws_iam_role" "organization_access" {
  for_each = toset([
    aws_organizations_account.security.id,
    aws_organizations_account.logging.id,
    aws_organizations_account.shared_services.id,
  ])

  name               = "OrganizationAccessRole"
  assume_role_policy = data.aws_iam_policy_document.organization_assume_role.json
  max_session_duration = 3600

  tags = {
    Project     = "gistpin"
    ManagedBy   = "terraform"
    Purpose     = "cross-account-access"
  }
}

resource "aws_iam_role_policy_attachment" "organization_access_security" {
  role       = aws_iam_role.organization_access[aws_organizations_account.security.id].name
  policy_arn = "arn:aws:iam::aws:policy/SecurityAudit"
}

# ---------------------------------------------------------------------------
# Consolidated Billing
# ---------------------------------------------------------------------------

resource "aws_organizations_delegated_administrator" "cost_analysis" {
  account_id        = aws_organizations_account.shared_services.id
  service_principal = "costexplorer.amazonaws.com"
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "organization_id" {
  value = aws_organizations_organization.gistpin.id
}

output "organization_arn" {
  value = aws_organizations_organization.gistpin.arn
}

output "management_account_id" {
  value = aws_organizations_organization.gistpin.master_account_id
}

output "account_ids" {
  value = {
    for k, v in aws_organizations_account.environment : k => v.id
  }
}
