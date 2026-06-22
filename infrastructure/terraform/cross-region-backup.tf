
# Terraform configuration for cross-region backup replication

# Variables for primary and secondary regions
variable "primary_aws_region" {
  description = "The primary AWS region for backups."
  type        = string
  default     = "us-east-1"
}

variable "secondary_aws_region" {
  description = "The secondary AWS region for backup replication."
  type        = string
  default     = "us-west-2"
}

# Provider for the secondary region
provider "aws" {
  alias  = "secondary"
  region = var.secondary_aws_region
}

# S3 bucket in the secondary region to store replicated backups
resource "aws_s3_bucket" "backup_replication_target" {
  provider = aws.secondary
  bucket   = "backup-replication-target-bucket" # Bucket names must be globally unique

  # Enable versioning to keep a history of backup files
  versioning {
    enabled = true
  }

  # Server-side encryption by default
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

# IAM role for S3 replication
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
POLICY
}

# IAM policy for S3 replication
resource "aws_iam_policy" "replication" {
  name = "s3-replication-policy"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::primary-backup-bucket/*" # ARN of the primary backup bucket
      ]
    },
    {
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Effect": "Allow",
      "Resource": "${aws_s3_bucket.backup_replication_target.arn}/*"
    }
  ]
}
POLICY
}

# Attach the replication policy to the replication role
resource "aws_iam_role_policy_attachment" "replication" {
  role       = aws_iam_role.replication.name
  policy_arn = aws_iam_policy.replication.arn
}

# Apply replication configuration to the primary bucket
# This part assumes you have a primary bucket defined elsewhere in your Terraform configuration.
# For this example, we are referencing it by name.
resource "aws_s3_bucket_replication_configuration" "primary" {
  # This should be the name of your primary backup bucket resource
  bucket = "primary-backup-bucket" 

  role = aws_iam_role.replication.arn

  rule {
    id = "replicate-all"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.backup_replication_target.arn
      storage_class = "STANDARD_IA"
    }

    # Optional: filter which objects to replicate
    # filter {
    #   prefix = "backups/"
    # }
  }
}