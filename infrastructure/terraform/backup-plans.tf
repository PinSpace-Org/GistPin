variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

resource "aws_backup_plan" "weekly" {
  name = "${var.project_name}-${var.environment}-weekly-plan"

  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"
    start_window      = 60
    completion_window = 360

    lifecycle {
      cold_storage_after = 30
      delete_after       = 365
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
