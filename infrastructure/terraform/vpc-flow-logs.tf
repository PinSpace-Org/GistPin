variable "flow_logs_retention_days" {
  description = "Number of days to retain VPC flow logs"
  type        = number
  default     = 365
}

variable "flow_logs_traffic_filter" {
  description = "Type of traffic to log (ALL | ACCEPT | REJECT)"
  type        = string
  default     = "ALL"
}

resource "aws_s3_bucket" "flow_logs" {
  bucket = "${var.project_name}-${var.environment}-flow-logs"
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    id     = "expire-flow-logs"
    status = "Enabled"

    filter {
      prefix = "AWSLogs/"
    }

    expiration {
      days = var.flow_logs_retention_days
    }

    transition {
      days          = 90
      storage_class = "GLACIER_IR"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }
  }
}

resource "aws_s3_bucket_policy" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs_bucket.json
}

data "aws_iam_policy_document" "flow_logs_bucket" {
  statement {
    sid    = "AllowVPCFlowLogDelivery"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }
    actions = [
      "s3:PutObject",
      "s3:GetBucketAcl"
    ]
    resources = [
      aws_s3_bucket.flow_logs.arn,
      "${aws_s3_bucket.flow_logs.arn}/*"
    ]
    condition {
      test     = "StringEquals"
      variable = "aws:SourceArn"
      values   = ["arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/vpc/flow-logs/*"]
    }
  }
}

resource "aws_flow_log" "vpc" {
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"
  traffic_type         = var.flow_logs_traffic_filter
  vpc_id               = aws_vpc.gistpin.id

  destination_options {
    file_format                = "parquet"
    per_hour_partition         = true
    hive_compatible_partitions = false
  }

  max_aggregation_interval = 60

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-vpc-flow-logs"
  })
}

resource "aws_flow_log" "subnet_public" {
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"
  traffic_type         = var.flow_logs_traffic_filter
  subnet_id            = aws_subnet.public_a.id

  destination_options {
    file_format                = "parquet"
    per_hour_partition         = true
    hive_compatible_partitions = false
  }

  max_aggregation_interval = 60

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-public-subnet-flow-logs"
  })
}

resource "aws_flow_log" "subnet_private" {
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"
  traffic_type         = var.flow_logs_traffic_filter
  subnet_id            = aws_subnet.private_a.id

  destination_options {
    file_format                = "parquet"
    per_hour_partition         = true
    hive_compatible_partitions = false
  }

  max_aggregation_interval = 60

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${var.environment}-private-subnet-flow-logs"
  })
}
