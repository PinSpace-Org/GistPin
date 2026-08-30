# Cross-account S3 replication for backups.
# Replicates critical buckets to a separate AWS account for disaster recovery,
# preserving encryption. IAM for the replication role and the destination bucket
# policy live in replication-iam.tf.

# Destination (DR) account and bucket. Declared here to keep this feature
# self-contained rather than editing the shared variables.tf.
variable "dr_account_id" {
  description = "AWS account ID that owns the destination (DR) buckets"
  type        = string
}

variable "dr_region" {
  description = "Region of the destination (DR) buckets"
  type        = string
  default     = "us-west-2"
}

variable "dr_kms_key_arn" {
  description = "KMS key ARN in the DR account used to re-encrypt replicated objects"
  type        = string
}

variable "replicated_buckets" {
  description = "Map of source bucket logical name => { source_bucket, dest_bucket }"
  type = map(object({
    source_bucket = string
    dest_bucket   = string
  }))
}

# Replication requires versioning on the source bucket.
resource "aws_s3_bucket_versioning" "source" {
  for_each = var.replicated_buckets
  bucket   = each.value.source_bucket
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_replication_configuration" "cross_account" {
  for_each = var.replicated_buckets

  # Replication config depends on versioning being enabled first.
  depends_on = [aws_s3_bucket_versioning.source]

  role   = aws_iam_role.replication.arn
  bucket = each.value.source_bucket

  rule {
    id     = "cross-account-dr"
    status = "Enabled"

    # Replicate everything, including delete markers, for a faithful DR copy.
    delete_marker_replication {
      status = "Enabled"
    }

    # Preserve encryption: replicate KMS-encrypted objects and re-encrypt them
    # with the DR account's KMS key at the destination.
    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }

    destination {
      bucket        = "arn:aws:s3:::${each.value.dest_bucket}"
      account       = var.dr_account_id
      storage_class = "STANDARD_IA"

      encryption_configuration {
        replica_kms_key_id = var.dr_kms_key_arn
      }

      # Take ownership in the destination account so the DR account fully
      # controls the replica (critical for a cross-account restore).
      access_control_translation {
        owner = "Destination"
      }

      # Replication metrics + RTC so replication lag is observable and bounded.
      metrics {
        status = "Enabled"
        event_threshold {
          minutes = 15
        }
      }
      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
    }
  }
}

# Alarm on replication falling behind the 15-minute RTC objective.
resource "aws_cloudwatch_metric_alarm" "replication_latency" {
  for_each = var.replicated_buckets

  alarm_name          = "${var.project_name}-${var.environment}-replication-latency-${each.key}"
  namespace           = "AWS/S3"
  metric_name         = "ReplicationLatency"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 900 # seconds (15 min)
  comparison_operator = "GreaterThanThreshold"
  alarm_description   = "Cross-account replication for ${each.value.source_bucket} is lagging beyond RTC objective"

  dimensions = {
    SourceBucket = each.value.source_bucket
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

output "replication_role_arn" {
  description = "IAM role used for cross-account replication"
  value       = aws_iam_role.replication.arn
}
