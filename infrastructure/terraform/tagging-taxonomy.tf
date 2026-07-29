################################################################################
# Tagging Taxonomy – comprehensive tag schema for GistPin
################################################################################

variable "tag_taxonomy_version" {
  description = "Version of the tagging taxonomy"
  type        = string
  default     = "1.0"
}

locals {
  # ── Automation tags ──────────────────────────────────────────────────
  automation_tags = {
    "gistpin:environment"     = var.environment
    "gistpin:managed-by"      = "terraform"
    "gistpin:provisioner"     = "terraform-cloud"
    "gistpin:terraform-workspace" = terraform.workspace
  }

  # ── Cost allocation tags ─────────────────────────────────────────────
  cost_tags = {
    "gistpin:cost-center"     = var.cost_center
    "gistpin:project"         = var.project_name
    "gistpin:service"         = ""
    "gistpin:sub-service"     = ""
    "gistpin:billing-code"    = ""
  }

  # ── Ownership tags ───────────────────────────────────────────────────
  ownership_tags = {
    "gistpin:owner"           = var.owner
    "gistpin:team"            = ""
    "gistpin:contact-email"   = ""
    "gistpin:slack-channel"   = ""
  }

  # ── Operational tags ─────────────────────────────────────────────────
  operational_tags = {
    "gistpin:tier"            = ""
    "gistpin:criticality"     = ""
    "gistpin:backup"          = ""
    "gistpin:retention"       = ""
    "gistpin:maintenance-window" = ""
  }

  # ── Security & compliance tags ───────────────────────────────────────
  security_tags = {
    "gistpin:data-classification" = ""
    "gistpin:compliance"          = ""
    "gistpin:encryption-required" = ""
    "gistpin:audit-enabled"       = ""
  }

  # ── Lifecycle tags ───────────────────────────────────────────────────
  lifecycle_tags = {
    "gistpin:created-by"      = ""
    "gistpin:created-date"    = ""
    "gistpin:decommission-date" = ""
    "gistpin:ttl"             = ""
  }

  # Combined taxonomy
  tagging_taxonomy = merge(
    local.automation_tags,
    local.cost_tags,
    local.ownership_tags,
    local.operational_tags,
    local.security_tags,
    local.lifecycle_tags,
  )

  # Required tag keys that must be present on all resources
  required_tag_keys = keys(local.tagging_taxonomy)
}

# ── Sentinel policy to enforce tagging taxonomy ──────────────────────────
resource "aws_s3_object" "tagging_sentinel_policy" {
  bucket = aws_s3_bucket.sentinel_policies.id
  key    = "enforce-tagging-taxonomy.sentinel"
  content = templatefile("${path.module}/templates/enforce-tagging-taxonomy.sentinel.tftpl", {
    required_tags = jsonencode(local.required_tag_keys)
    taxonomy_ver  = var.tag_taxonomy_version
  })
  etag = filemd5("${path.module}/templates/enforce-tagging-taxonomy.sentinel.tftpl")
}

# ── AWS Config rule to check required tags ──────────────────────────────
resource "aws_config_config_rule" "tagging_taxonomy" {
  name        = "${var.project_name}-tagging-taxonomy"
  description = "Ensures all resources comply with the GistPin tagging taxonomy v${var.tag_taxonomy_version}"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "gistpin:environment"
    tag2Key = "gistpin:cost-center"
    tag3Key = "gistpin:project"
    tag4Key = "gistpin:owner"
    tag5Key = "gistpin:managed-by"
  })
}

# ── Report non-compliant resources ──────────────────────────────────────
resource "aws_config_config_rule" "tagging_taxonomy_automation" {
  name        = "${var.project_name}-tagging-automation"
  description = "Ensures automation tags are present"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "gistpin:environment"
    tag2Key = "gistpin:managed-by"
    tag3Key = "gistpin:provisioner"
  })
}

output "tagging_taxonomy_keys" {
  description = "All tagging taxonomy keys"
  value       = local.required_tag_keys
}

output "tagging_taxonomy_version" {
  description = "Current taxonomy version"
  value       = var.tag_taxonomy_version
}
