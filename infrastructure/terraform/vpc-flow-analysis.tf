variable "vpc_id" {
  description = "VPC ID to enable flow logs on"
  type        = string
}

variable "flow_logs_bucket" {
  description = "S3 bucket name for VPC flow log storage"
  type        = string
  default     = "gistpin-vpc-flow-logs"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# S3 bucket for flow log aggregation
resource "aws_s3_bucket" "flow_logs" {
  bucket        = var.flow_logs_bucket
  force_destroy = false

  tags = { Name = "vpc-flow-logs", ManagedBy = "terraform" }
}

resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    expiration { days = 90 }
  }
}

# VPC Flow Logs → S3
resource "aws_flow_log" "vpc" {
  vpc_id               = var.vpc_id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_format           = "$${version} $${account-id} $${interface-id} $${srcaddr} $${dstaddr} $${srcport} $${dstport} $${protocol} $${packets} $${bytes} $${start} $${end} $${action} $${log-status}"

  tags = { Name = "vpc-flow-log" }
}

# Athena database for querying flow logs
resource "aws_athena_database" "flow_logs" {
  name   = "vpc_flow_logs"
  bucket = aws_s3_bucket.flow_logs.bucket
}

resource "aws_athena_named_query" "rejected_traffic" {
  name      = "rejected_traffic_last_hour"
  database  = aws_athena_database.flow_logs.name
  query     = file("${path.module}/../../scripts/analyze-flow-logs.sql")
  workgroup = "primary"
}

output "flow_logs_bucket" {
  value = aws_s3_bucket.flow_logs.bucket
}

output "athena_database" {
  value = aws_athena_database.flow_logs.name
}
