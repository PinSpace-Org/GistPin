# Resource ownership mapping — drives the Terraform change notification system.
# Each entry maps a Terraform address prefix (module or resource-type prefix) to
# the team that owns it and how they want to be notified. Consumed by
# infrastructure/scripts/notify-resource-owners.sh via the rendered
# `resource_ownership_map` output.

locals {
  # Ordered most-specific-first: notify-resource-owners.sh matches a changed
  # resource address against these prefixes and takes the first that matches.
  resource_owners = {
    "module.database" = {
      team          = "data-platform"
      slack_channel = "#data-platform-changes"
      email         = "data-platform@gistpin.io"
      opt_out       = false
    }
    "aws_db_" = {
      team          = "data-platform"
      slack_channel = "#data-platform-changes"
      email         = "data-platform@gistpin.io"
      opt_out       = false
    }
    "module.networking" = {
      team          = "platform"
      slack_channel = "#platform-changes"
      email         = "platform@gistpin.io"
      opt_out       = false
    }
    "aws_security_group" = {
      team          = "security"
      slack_channel = "#security-changes"
      email         = "security@gistpin.io"
      opt_out       = false
    }
    "aws_iam_" = {
      team          = "security"
      slack_channel = "#security-changes"
      email         = "security@gistpin.io"
      opt_out       = false
    }
    "aws_cloudfront" = {
      team          = "frontend"
      slack_channel = "#frontend-changes"
      email         = "frontend@gistpin.io"
      # Frontend has opted out of email; Slack only.
      opt_out = true
    }
  }

  # Fallback owner for any resource that doesn't match a prefix above.
  default_owner = {
    team          = "platform"
    slack_channel = "#platform-changes"
    email         = "platform@gistpin.io"
    opt_out       = false
  }
}

# Rendered as JSON so the notification script can consume ownership without
# parsing HCL. `terraform output -raw resource_ownership_map` feeds the script.
output "resource_ownership_map" {
  description = "Resource-address-prefix to owning-team notification mapping, as JSON"
  value = jsonencode({
    owners  = local.resource_owners
    default = local.default_owner
  })
}
