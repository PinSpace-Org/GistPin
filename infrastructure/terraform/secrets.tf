# Additional secrets resources for GistPin runtime values

resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "${var.project_name}-${var.environment}-db-credentials"
  description             = "Database credentials for ${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "app_keys" {
  name                    = "${var.project_name}-${var.environment}-app-keys"
  description             = "Application signing keys and API credentials for ${var.environment}"
  recovery_window_in_days = 7

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "app_keys" {
  secret_id = aws_secretsmanager_secret.app_keys.id
  secret_string = jsonencode({
    jwt_secret    = var.jwt_secret
    api_key       = var.api_key
    smtp_password = var.smtp_password
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

output "db_credentials_arn" {
  description = "ARN of the database credentials secret"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

output "app_keys_arn" {
  description = "ARN of the application keys secret"
  value       = aws_secretsmanager_secret.app_keys.arn
}
