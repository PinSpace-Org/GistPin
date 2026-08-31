# Cross-cutting variable validation.
#
# Per-variable rules (format, allowed values) live inline in variables.tf,
# because Terraform requires a `validation` block to sit inside the `variable`
# it constrains. This file holds:
#   1. Reusable validation patterns/locals referenced by resources.
#   2. A `check` block asserting cross-variable invariants that no single
#      variable's validation can express.

locals {
  # Canonical regexes, kept in one place so resources and any future
  # validations stay consistent.
  validation_patterns = {
    cidr_block  = "^([0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$"
    subnet_id   = "^subnet-[0-9a-f]{8,17}$"
    vpc_id      = "^vpc-[0-9a-f]{8,17}$"
    environment = "^(dev|staging|prod)$"
  }

  # Regions GistPin is approved to deploy in — the single source of truth for
  # the region variable validation and any region allowlisting in resources.
  approved_regions = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Cross-variable invariants. `check` blocks (Terraform >= 1.5) report a warning
# on plan/apply without blocking, which is the right severity for advisory
# consistency rules that span multiple inputs.
check "environment_region_consistency" {
  assert {
    # Production must not run in a non-approved region even transiently.
    condition     = var.environment != "prod" || contains(local.approved_regions, var.region)
    error_message = "prod deployments must target an approved region (${join(", ", local.approved_regions)})."
  }
}

check "subnet_capacity" {
  assert {
    # Public subnets shouldn't outnumber private ones — a sign the network
    # layout was mis-specified for a private-by-default architecture.
    condition     = length(var.public_subnet_ids) <= length(var.private_subnet_ids)
    error_message = "public subnets should not outnumber private subnets in a private-by-default VPC."
  }
}
