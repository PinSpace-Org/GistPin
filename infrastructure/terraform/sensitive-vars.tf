# Sensitive variable management for GistPin
# Marks all sensitive Terraform variables and validates them

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 16
    error_message = "db_password must be at least 16 characters."
  }
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,}$", var.db_username))
    error_message = "db_username must start with a letter and contain only alphanumeric characters and underscores."
  }
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "jwt_secret must be at least 32 characters."
  }
}

variable "api_key" {
  description = "External API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "smtp_password" {
  description = "SMTP server password for email delivery"
  type        = string
  sensitive   = true
  default     = ""
}

# Fetch runtime secrets from AWS Secrets Manager
data "aws_secretsmanager_secret_version" "app" {
  secret_id = "${var.project_name}-${var.environment}-secret"
}

locals {
  app_secrets = jsondecode(data.aws_secretsmanager_secret_version.app.secret_string)
}

output "secrets_arn" {
  description = "ARN of the app secrets (non-sensitive reference only)"
  value       = data.aws_secretsmanager_secret_version.app.arn
}
