# Terraform state S3 bucket with customer-managed KMS encryption.
# The bucket's default SSE uses the CMK from kms-state.tf, so every state object
# is encrypted with a key we control, rotate, and audit.

variable "state_bucket_name" {
  description = "Name of the S3 bucket holding Terraform state"
  type        = string
}

resource "aws_s3_bucket" "tf_state" {
  bucket = var.state_bucket_name

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "terraform-state"
  }
}

# Versioning: keep state history so a bad apply can be rolled back.
resource "aws_s3_bucket_versioning" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Default encryption with the customer-managed key.
resource "aws_s3_bucket_server_side_encryption_configuration" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tf_state.arn
    }
    # Reduce KMS request volume/cost on many small state writes.
    bucket_key_enabled = true
  }
}

# Deny any object write that isn't encrypted with our CMK — defense in depth in
# case a caller tries to override SSE.
resource "aws_s3_bucket_policy" "tf_state" {
  bucket = aws_s3_bucket.tf_state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyUnEncryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.tf_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid       = "DenyWrongKmsKey"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.tf_state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.tf_state.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_public_access_block" "tf_state" {
  bucket                  = aws_s3_bucket.tf_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Access logging: record who reads/writes state objects, for the key-usage audit
# trail. CloudTrail data events on the bucket capture the KMS decrypt calls.
resource "aws_s3_bucket" "tf_state_logs" {
  bucket = "${var.state_bucket_name}-access-logs"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "terraform-state-access-logs"
  }
}

resource "aws_s3_bucket_logging" "tf_state" {
  bucket        = aws_s3_bucket.tf_state.id
  target_bucket = aws_s3_bucket.tf_state_logs.id
  target_prefix = "state-access/"
}

output "tf_state_bucket" {
  description = "S3 bucket name for Terraform state (KMS-encrypted)"
  value       = aws_s3_bucket.tf_state.id
}
