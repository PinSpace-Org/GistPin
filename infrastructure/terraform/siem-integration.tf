# SIEM Integration — forward CloudTrail, K8s audit logs, and application security events

resource "aws_cloudwatch_log_group" "siem_trail" {
  name              = "/aws/cloudtrail/${var.project_name}-${var.environment}-siem"
  retention_in_days = 90
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_kinesis_firehose_delivery_stream" "siem" {
  name        = "${var.project_name}-${var.environment}-siem-stream"
  destination = "http_endpoint"

  http_endpoint_configuration {
    url                = var.siem_endpoint_url
    name               = "SIEM Endpoint"
    buffering_size     = 5
    buffering_interval = 60
    retry_duration     = 300

    request_configuration {
      content_encoding = "GZIP"
    }

    s3_backup_mode = "FailedDataOnly"

    s3_configuration {
      role_arn           = aws_iam_role.firehose_siem.arn
      bucket_arn         = aws_s3_bucket.siem_backup.arn
      buffering_size     = 10
      buffering_interval = 400
      compression_format = "GZIP"
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_s3_bucket" "siem_backup" {
  bucket = "${var.project_name}-${var.environment}-siem-backup"
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "siem_backup" {
  bucket = aws_s3_bucket.siem_backup.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    expiration { days = 365 }
  }
}

resource "aws_iam_role" "firehose_siem" {
  name = "${var.project_name}-${var.environment}-firehose-siem"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "firehose.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "firehose_siem_s3" {
  name = "firehose-siem-s3"
  role = aws_iam_role.firehose_siem.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetBucketLocation"]
      Resource = ["${aws_s3_bucket.siem_backup.arn}/*", aws_s3_bucket.siem_backup.arn]
    }]
  })
}

variable "siem_endpoint_url" {
  description = "SIEM HTTP endpoint URL for log forwarding"
  type        = string
  sensitive   = true
  default     = ""
}

output "siem_firehose_arn" {
  description = "Kinesis Firehose ARN for SIEM log stream"
  value       = aws_kinesis_firehose_delivery_stream.siem.arn
}
