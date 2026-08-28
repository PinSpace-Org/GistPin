terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Ephemeral workspace backend — isolated from production state
  backend "s3" {
    bucket               = "gistpin-terraform-state"
    key                  = "dry-run/terraform.tfstate"
    region               = "us-east-1"
    workspace_key_prefix = "dry-run"
  }
}

variable "environment" {
  description = "Dry-run environment name"
  type        = string
  default     = "dry-run"
}

variable "cost_estimate_only" {
  description = "When true, outputs cost estimate without creating resources"
  type        = bool
  default     = true
}

# Cost estimation output — populated by infracost in CI
output "estimated_monthly_cost" {
  description = "Estimated monthly cost for the planned changes"
  value       = "Run `infracost breakdown --path .` for cost estimate"
}
