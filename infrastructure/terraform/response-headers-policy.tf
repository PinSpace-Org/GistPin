###############################################################################
# CloudFront Distribution – Response Headers Policy Attachment
# Issue #1127: AWS CloudFront security headers policy
###############################################################################

# Variables used by the CloudFront security headers configuration
variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "gistpin"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging)"
  type        = string
  default     = "prod"
}

variable "allowed_origins" {
  description = "List of origins allowed in CORS responses"
  type        = list(string)
  default     = ["https://gistpin.io"]
}

variable "cloudfront_distribution_id" {
  description = "ID of the existing CloudFront distribution to attach the headers policy to"
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# Data source: look up the existing CloudFront distribution
# ---------------------------------------------------------------------------
data "aws_cloudfront_distribution" "main" {
  count = var.cloudfront_distribution_id != "" ? 1 : 0
  id    = var.cloudfront_distribution_id
}

# ---------------------------------------------------------------------------
# Local value that resolves the headers policy ARN for use in other resources
# ---------------------------------------------------------------------------
locals {
  security_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
}

# ---------------------------------------------------------------------------
# Output: expose the policy ID so it can be referenced in distribution config
# ---------------------------------------------------------------------------
output "security_headers_policy_id" {
  description = "ID of the CloudFront response headers policy to attach to cache behaviors"
  value       = aws_cloudfront_response_headers_policy.security_headers.id
}

output "security_headers_policy_arn" {
  description = "ARN of the CloudFront response headers policy"
  value       = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:response-headers-policy/${aws_cloudfront_response_headers_policy.security_headers.id}"
}

# ---------------------------------------------------------------------------
# Current AWS account (needed for ARN construction)
# ---------------------------------------------------------------------------
data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Example: how to attach the headers policy to a CloudFront distribution
# (uncomment and adapt to your distribution resource)
# ---------------------------------------------------------------------------
# resource "aws_cloudfront_distribution" "main" {
#   ...
#   default_cache_behavior {
#     ...
#     response_headers_policy_id = local.security_headers_policy_id
#   }
#
#   ordered_cache_behavior {
#     path_pattern               = "/api/*"
#     ...
#     response_headers_policy_id = local.security_headers_policy_id
#   }
# }
