# Multi-environment workspace configuration
locals {
  env_config = {
    dev = {
      instance_type = "t3.micro"
      min_capacity  = 1
      max_capacity  = 2
    }
    staging = {
      instance_type = "t3.small"
      min_capacity  = 1
      max_capacity  = 3
    }
    prod = {
      instance_type = "t3.medium"
      min_capacity  = 2
      max_capacity  = 10
    }
  }

  current_env    = terraform.workspace
  current_config = lookup(local.env_config, local.current_env, local.env_config["dev"])
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "gistpin"
}

output "workspace_name" {
  description = "Current Terraform workspace"
  value       = terraform.workspace
}

output "instance_type" {
  description = "Instance type for current environment"
  value       = local.current_config.instance_type
}