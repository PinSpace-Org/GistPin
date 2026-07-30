################################################################################
# Tag Locals – consolidated tag maps for resource-level assignment
################################################################################

locals {
  # ── Tier-based tag maps ──────────────────────────────────────────────

  tier1_critical_tags = {
    "gistpin:environment"         = var.environment
    "gistpin:cost-center"         = var.cost_center
    "gistpin:project"             = var.project_name
    "gistpin:service"             = ""
    "gistpin:owner"               = var.owner
    "gistpin:team"                = "platform-core"
    "gistpin:tier"                = "1"
    "gistpin:criticality"         = "critical"
    "gistpin:backup"              = "daily"
    "gistpin:retention"           = "365"
    "gistpin:data-classification" = "restricted"
    "gistpin:encryption-required" = "true"
    "gistpin:audit-enabled"       = "true"
    "gistpin:managed-by"          = "terraform"
    "gistpin:provisioner"         = "terraform-cloud"
  }

  tier2_important_tags = {
    "gistpin:environment"         = var.environment
    "gistpin:cost-center"         = var.cost_center
    "gistpin:project"             = var.project_name
    "gistpin:service"             = ""
    "gistpin:owner"               = var.owner
    "gistpin:team"                = ""
    "gistpin:tier"                = "2"
    "gistpin:criticality"         = "high"
    "gistpin:backup"              = "daily"
    "gistpin:retention"           = "90"
    "gistpin:data-classification" = "sensitive"
    "gistpin:encryption-required" = "true"
    "gistpin:audit-enabled"       = "true"
    "gistpin:managed-by"          = "terraform"
    "gistpin:provisioner"         = "terraform-cloud"
  }

  tier3_standard_tags = {
    "gistpin:environment"         = var.environment
    "gistpin:cost-center"         = var.cost_center
    "gistpin:project"             = var.project_name
    "gistpin:service"             = ""
    "gistpin:owner"               = var.owner
    "gistpin:tier"                = "3"
    "gistpin:criticality"         = "standard"
    "gistpin:backup"              = "weekly"
    "gistpin:retention"           = "30"
    "gistpin:data-classification" = "internal"
    "gistpin:managed-by"          = "terraform"
    "gistpin:provisioner"         = "terraform-cloud"
  }

  tier4_dev_tags = {
    "gistpin:environment"         = var.environment
    "gistpin:cost-center"         = var.cost_center
    "gistpin:project"             = var.project_name
    "gistpin:owner"               = var.owner
    "gistpin:tier"                = "4"
    "gistpin:criticality"         = "low"
    "gistpin:backup"              = "none"
    "gistpin:retention"           = "7"
    "gistpin:data-classification" = "public"
    "gistpin:managed-by"          = "terraform"
    "gistpin:provisioner"         = "terraform-cloud"
  }

  # ── Environment-specific tag overrides ───────────────────────────────

  env_tags = {
    production  = merge(local.tier2_important_tags, { "gistpin:environment" = "production" })
    staging     = merge(local.tier3_standard_tags, { "gistpin:environment" = "staging" })
    development = merge(local.tier4_dev_tags,      { "gistpin:environment" = "development" })
  }

  # ── Service-specific tags ────────────────────────────────────────────

  service_tags = {
    api          = { "gistpin:service" = "api",          "gistpin:sub-service" = "backend" }
    frontend     = { "gistpin:service" = "frontend",     "gistpin:sub-service" = "web" }
    database     = { "gistpin:service" = "database",     "gistpin:sub-service" = "postgres" }
    cache        = { "gistpin:service" = "cache",        "gistpin:sub-service" = "redis" }
    analytics    = { "gistpin:service" = "analytics",    "gistpin:sub-service" = "data-pipeline" }
    cdn          = { "gistpin:service" = "cdn",          "gistpin:sub-service" = "cloudfront" }
    search       = { "gistpin:service" = "search",       "gistpin:sub-service" = "elasticsearch" }
    queue        = { "gistpin:service" = "queue",        "gistpin:sub-service" = "sqs" }
    monitoring   = { "gistpin:service" = "monitoring",   "gistpin:sub-service" = "observability" }
    networking   = { "gistpin:service" = "networking",   "gistpin:sub-service" = "vpc" }
    security     = { "gistpin:service" = "security",     "gistpin:sub-service" = "iam" }
    ci_cd        = { "gistpin:service" = "ci-cd",        "gistpin:sub-service" = "github-actions" }
  }
}
