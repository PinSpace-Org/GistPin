# Mock AWS provider for local development without real cloud access.
#
# This is a standalone dev overlay (its own root module) — it does NOT share
# state or providers with the production root in ../. It points the AWS provider
# at LocalStack so `plan`/`apply` exercise the same configuration locally using
# simulated resources, with no real credentials and no cloud spend.

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# LocalStack endpoint (override via TF_VAR_localstack_endpoint or the default).
variable "localstack_endpoint" {
  description = "LocalStack edge endpoint for simulated AWS services"
  type        = string
  default     = "http://localhost:4566"
}

# Toggle: in CI "mock mode" the provider talks to LocalStack; developers can flip
# this to point at a sandbox account instead.
variable "mock_mode" {
  description = "When true, use LocalStack; when false, use real AWS credentials"
  type        = bool
  default     = true
}

provider "aws" {
  region = "us-east-1"

  # Fake static credentials — never real. LocalStack accepts any values.
  access_key = "mock"
  secret_key = "mock"

  # Skip the network round-trips that require a real AWS account/credentials.
  skip_credentials_validation = var.mock_mode
  skip_requesting_account_id  = var.mock_mode
  skip_metadata_api_check     = var.mock_mode
  skip_region_validation      = var.mock_mode

  # Route every service this project uses to LocalStack when mocking.
  dynamic "endpoints" {
    for_each = var.mock_mode ? [1] : []
    content {
      s3         = var.localstack_endpoint
      iam        = var.localstack_endpoint
      sts        = var.localstack_endpoint
      ec2        = var.localstack_endpoint
      kms        = var.localstack_endpoint
      cloudwatch = var.localstack_endpoint
      logs       = var.localstack_endpoint
      ssm        = var.localstack_endpoint
      eks        = var.localstack_endpoint
    }
  }

  # LocalStack expects path-style S3 addressing.
  s3_use_path_style = var.mock_mode
}
