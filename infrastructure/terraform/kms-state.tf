# Customer-managed KMS key for encrypting Terraform state at rest.
# Paired with s3-state-encryption.tf, which points the state bucket's SSE at
# this key. The key rotates annually and its policy is least-privilege.

data "aws_caller_identity" "current" {}

# Principals allowed to USE the key to encrypt/decrypt state. Restrict this to
# the CI/CD role and the platform admins that run Terraform — nothing else.
variable "state_key_user_arns" {
  description = "IAM principal ARNs allowed to use the state KMS key (CI role, platform admins)"
  type        = list(string)
}

resource "aws_kms_key" "tf_state" {
  description             = "${var.project_name}-${var.environment} Terraform state encryption key"
  deletion_window_in_days = 30
  # Annual automatic rotation of the backing key material.
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Root account retains administrative control of the key (break-glass);
        # this does not by itself grant data-plane encrypt/decrypt.
        Sid       = "EnableRootAccountAdmin"
        Effect    = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        # Least-privilege data-plane use: only the named principals may use the
        # key, and only for the crypto operations state encryption needs.
        Sid       = "AllowStateEncryptDecrypt"
        Effect    = "Allow"
        Principal = { AWS = var.state_key_user_arns }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
        ]
        Resource = "*"
        Condition = {
          # Only via S3 in this region — the key can't be used to decrypt state
          # through some other service.
          StringEquals = {
            "kms:ViaService" = "s3.${var.region}.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "terraform-state-encryption"
  }
}

resource "aws_kms_alias" "tf_state" {
  name          = "alias/${var.project_name}-${var.environment}-tf-state"
  target_key_id = aws_kms_key.tf_state.key_id
}

output "tf_state_kms_key_arn" {
  description = "ARN of the customer-managed key encrypting Terraform state"
  value       = aws_kms_key.tf_state.arn
}
