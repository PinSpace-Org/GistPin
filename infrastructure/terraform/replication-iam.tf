# IAM for cross-account S3 replication.
# The replication role is assumed by S3 in the SOURCE account; its policy grants
# read on the source and write on the destination. The destination bucket policy
# (applied in the DR account) must in turn allow this role — captured here as a
# document to apply in that account.

data "aws_iam_policy_document" "replication_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "replication" {
  name               = "${var.project_name}-${var.environment}-s3-replication"
  assume_role_policy = data.aws_iam_policy_document.replication_assume.json

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

data "aws_iam_policy_document" "replication" {
  # Read source objects + versioning/replication config.
  statement {
    sid    = "SourceRead"
    effect = "Allow"
    actions = [
      "s3:GetReplicationConfiguration",
      "s3:ListBucket",
      "s3:GetObjectVersionForReplication",
      "s3:GetObjectVersionAcl",
      "s3:GetObjectVersionTagging",
    ]
    resources = concat(
      [for b in var.replicated_buckets : "arn:aws:s3:::${b.source_bucket}"],
      [for b in var.replicated_buckets : "arn:aws:s3:::${b.source_bucket}/*"],
    )
  }

  # Write replicas into the destination (DR account) buckets.
  statement {
    sid    = "DestinationWrite"
    effect = "Allow"
    actions = [
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ReplicateTags",
      "s3:ObjectOwnerOverrideToBucketOwner",
    ]
    resources = [for b in var.replicated_buckets : "arn:aws:s3:::${b.dest_bucket}/*"]
  }

  # KMS: decrypt source objects, encrypt replicas with the DR key.
  statement {
    sid       = "KmsDecryptSource"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringLike"
      variable = "kms:ViaService"
      values   = ["s3.${var.region}.amazonaws.com"]
    }
  }
  statement {
    sid       = "KmsEncryptDestination"
    effect    = "Allow"
    actions   = ["kms:Encrypt"]
    resources = [var.dr_kms_key_arn]
    condition {
      test     = "StringLike"
      variable = "kms:ViaService"
      values   = ["s3.${var.dr_region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "replication" {
  name   = "${var.project_name}-${var.environment}-s3-replication"
  role   = aws_iam_role.replication.id
  policy = data.aws_iam_policy_document.replication.json
}

# Destination bucket policy to apply IN THE DR ACCOUNT: allow the source
# account's replication role to replicate objects and take ownership. Exposed as
# an output so it can be applied with a provider aliased to the DR account.
data "aws_iam_policy_document" "destination_bucket_policy" {
  statement {
    sid    = "AllowSourceReplication"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = [aws_iam_role.replication.arn]
    }
    actions = [
      "s3:ReplicateObject",
      "s3:ReplicateDelete",
      "s3:ReplicateTags",
      "s3:ObjectOwnerOverrideToBucketOwner",
      "s3:List*",
      "s3:GetBucketVersioning",
      "s3:PutBucketVersioning",
    ]
    resources = concat(
      [for b in var.replicated_buckets : "arn:aws:s3:::${b.dest_bucket}"],
      [for b in var.replicated_buckets : "arn:aws:s3:::${b.dest_bucket}/*"],
    )
  }
}

output "destination_bucket_policy_json" {
  description = "Bucket policy to apply on the DR-account destination buckets"
  value       = data.aws_iam_policy_document.destination_bucket_policy.json
}
