################################################################################
# AWS Macie – sensitive data discovery & protection for GistPin S3
#
# Enables Macie in the account, schedules recurring classification jobs over the
# GistPin data buckets, exports findings to a dedicated S3 bucket, and routes
# high-severity findings through SNS for alerting.
#
# Remediation playbook summary (full runbook: infrastructure/security/remediation-playbooks):
#   1. Triage the finding type from the alert payload (severity + affected bucket/object).
#   2. Quarantine: move/restrict the object (S3 Access Point policy or object ACL)
#      so it is no longer publicly readable.
#   3. Rotate any exposed credential material referenced by the identifier type
#      (API keys -> secrets manager rotation; wallet keys -> on-chain rotation).
#   4. Delete or re-encrypt the sensitive object at rest.
#   5. Verify the finding is resolved in the Macie console, then close the incident.
################################################################################

data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Enable Macie for the account/region
# ---------------------------------------------------------------------------

resource "aws_macie2_account" "main" {
  status                        = "ENABLED"
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "sensitive-data-discovery"
  }
}

# ---------------------------------------------------------------------------
# Dedicated bucket for exported Macie findings (encrypted, versioned)
# ---------------------------------------------------------------------------

resource "aws_s3_bucket" "macie_findings" {
  bucket = "${var.project_name}-${var.environment}-macie-findings"
  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "macie-findings"
  }
}

resource "aws_s3_bucket_versioning" "macie_findings" {
  bucket = aws_s3_bucket.macie_findings.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "macie_findings" {
  bucket = aws_s3_bucket.macie_findings.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "macie_findings" {
  bucket                  = aws_s3_bucket.macie_findings.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ---------------------------------------------------------------------------
# Export classification + policy findings to the findings bucket
# ---------------------------------------------------------------------------

resource "aws_macie2_classification_export_configuration" "findings" {
  depends_on = [aws_macie2_account.main]

  s3_destination {
    bucket_name = aws_s3_bucket.macie_findings.bucket
    key_prefix  = "macie/classification-findings"
  }

  configuration {
    classification {
      continuous = true
    }
  }
}

# ---------------------------------------------------------------------------
# Scheduled discovery job – scans GistPin data buckets daily
#
# Scans user-uploaded content (uploads), database dumps (backups) and service
# logs (logs). A full scan runs once daily; sensitive-data occurrences found by
# continuous analysis are updated incrementally.
# ---------------------------------------------------------------------------

locals {
  macie_scanned_buckets = [
    "${var.project_name}-${var.environment}-uploads",
    "${var.project_name}-${var.environment}-backups",
    "${var.project_name}-${var.environment}-logs",
  ]
}

resource "aws_macie2_classification_job" "daily_scan" {
  depends_on = [aws_macie2_account.main]

  name     = "${var.project_name}-${var.environment}-daily-s3-discovery"
  job_type = "SCHEDULED"

  schedule_frequency {
    daily_schedule = 1
  }

  bucket_criteria {
    includes {
      and {
        simple_criterion {
          comparator = "EQ"
          key        = "BUCKET_NAME"
          values     = local.macie_scanned_buckets
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "sensitive-data-discovery"
  }
}

# ---------------------------------------------------------------------------
# Severity routing – EventBridge rules publish findings to SNS topics
#   * High/Critical  -> existing gistpin-alerts topic (immediate paging)
#   * Low/Medium     -> dedicated digest topic (reviewed periodically)
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_event_rule" "macie_finding_critical" {
  name        = "${var.project_name}-${var.environment}-macie-finding-critical"
  description = "High or critical severity Macie sensitive-data findings"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      severity = {
        description = ["Critical", "High"]
      }
    }
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_event_rule" "macie_finding_low_medium" {
  name        = "${var.project_name}-${var.environment}-macie-finding-low-medium"
  description = "Low or medium severity Macie sensitive-data findings"

  event_pattern = jsonencode({
    source      = ["aws.macie"]
    detail-type = ["Macie Finding"]
    detail = {
      severity = {
        description = ["Low", "Medium"]
      }
    }
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# Critical/High findings page the on-call channel immediately
resource "aws_cloudwatch_event_target" "critical_to_alerts" {
  rule      = aws_cloudwatch_event_rule.macie_finding_critical.name
  target_id = "macie-critical-findings"
  arn       = aws_sns_topic.gistpin_alerts.arn
}

# Low/Medium findings go to a digest topic reviewed during triage
resource "aws_sns_topic" "macie_digest" {
  name = "${var.project_name}-${var.environment}-macie-digest"
}

resource "aws_cloudwatch_event_target" "low_medium_to_digest" {
  rule      = aws_cloudwatch_event_rule.macie_finding_low_medium.name
  target_id = "macie-low-medium-findings"
  arn       = aws_sns_topic.macie_digest.arn
}

resource "aws_sns_topic_policy" "macie_digest" {
  arn = aws_sns_topic.macie_digest.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowEventBridgePublish"
        Effect    = "Allow"
        Principal = { Service = "events.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.macie_digest.arn
        Condition = {
          ArnEquals = {
            "AWS:SourceArn" = [
              aws_cloudwatch_event_rule.macie_finding_critical.arn,
              aws_cloudwatch_event_rule.macie_finding_low_medium.arn,
            ]
          }
        }
      },
    ]
  })
}

# ---------------------------------------------------------------------------
# Outputs consumed by monitoring/alerting tooling
# ---------------------------------------------------------------------------

output "macie_status" {
  description = "Macie enablement status for the account"
  value       = aws_macie2_account.main.status
}

output "macie_daily_scan_job_id" {
  description = "ID of the scheduled S3 discovery classification job"
  value       = aws_macie2_classification_job.daily_scan.id
}

output "macie_findings_bucket" {
  description = "Bucket where Macie exports its findings"
  value       = aws_s3_bucket.macie_findings.bucket
}
