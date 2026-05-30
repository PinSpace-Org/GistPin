# Standard tag schema for cost tracking and resource management
locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    CostCenter  = var.cost_center
    Owner       = var.owner
    ManagedBy   = "terraform"
  }
}

variable "project_name" {
  description = "Project name for cost allocation"
  type        = string
  default     = "gistpin"
}

variable "environment" {
  description = "Deployment environment (dev/staging/prod)"
  type        = string
  default     = "dev"
}

variable "cost_center" {
  description = "Cost center for billing allocation"
  type        = string
  default     = "engineering"
}

variable "owner" {
  description = "Team or individual responsible for resources"
  type        = string
  default     = "platform-team"
}

output "common_tags" {
  description = "Standard tags applied to all resources"
  value       = local.common_tags
}