resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${var.environment}"
  tags   = { Name = "${var.project_name}-terraform-state-${var.environment}", Environment = var.environment, Project = var.project_name, ManagedBy = "terraform" }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"
    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_logging" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  target_bucket = aws_s3_bucket.access_logs.id
  target_prefix = "tf-state-logs/"
}

resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.project_name}-tf-access-logs-${var.environment}"
  tags   = { Name = "${var.project_name}-tf-access-logs-${var.environment}", Environment = var.environment, Project = var.project_name, ManagedBy = "terraform" }
}

resource "aws_s3_bucket_versioning" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "access_logs" {
  bucket = aws_s3_bucket.access_logs.id
  rule {
    id     = "expire-old-logs"
    status = "Enabled"
    expiration {
      days = 365
    }
  }
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project_name}-terraform-locks-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
  server_side_encryption {
    enabled = true
  }
  point_in_time_recovery {
    enabled = true
  }
  tags = { Name = "${var.project_name}-terraform-locks-${var.environment}", Environment = var.environment, Project = var.project_name, ManagedBy = "terraform" }
}
