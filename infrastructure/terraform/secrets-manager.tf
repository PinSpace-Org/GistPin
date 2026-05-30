# Secrets Manager for centralized secrets storage
resource "aws_secretsmanager_secret" "app_secret" {
  name                    = "${var.app_name}-${var.environment}-secret"
  description             = "Application secrets for ${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "app_secret_version" {
  secret_id = aws_secretsmanager_secret.app_secret.id
  secret_string = jsonencode({
    placeholder = "replace-with-real-secret"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "gistpin"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

output "secret_arn" {
  description = "ARN of the application secret"
  value       = aws_secretsmanager_secret.app_secret.arn
}