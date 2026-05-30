resource "aws_backup_vault" "main" {
  name        = "${var.project_name}-${var.environment}-vault"
  kms_key_arn = aws_kms_key.backup.arn

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_key" "backup" {
  description             = "${var.project_name} backup encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
