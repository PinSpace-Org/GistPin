# AWS WAF Rate-Based Rules (#1131)
# Terraform resource: aws_wafv2_web_acl with rate-based statements
# - Rule 1: Limit requests to 2000 per 5 min per IP
# - Rule 2: Rate-limit requests with Stellar address header

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

variable "waf_rate_limit" {
  description = "Maximum number of requests allowed per 5-minute window per IP"
  type        = number
  default     = 2000
}

variable "stellar_header_rate_limit" {
  description = "Rate limit for requests containing a Stellar address header"
  type        = number
  default     = 500
}

variable "environment" {
  description = "Deployment environment (e.g. production, staging)"
  type        = string
  default     = "production"
}

resource "aws_wafv2_web_acl" "gasguard_rate_acl" {
  name        = "gasguard-rate-rules-${var.environment}"
  description = "WAF ACL with rate-based rules for GasGuard API protection"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Global IP-based rate limiting — 2000 req per 5 min per IP
  rule {
    name     = "IPRateLimit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "IPRateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Stellar address header rate limiting
  # Targets requests that include the X-Stellar-Address header (e.g. API callers
  # submitting signed Stellar transactions) to prevent abuse.
  rule {
    name     = "StellarAddressHeaderRateLimit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.stellar_header_rate_limit
        aggregate_key_type = "CUSTOM_KEYS"

        custom_key {
          header {
            name          = "x-stellar-address"
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "StellarHeaderRateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GasGuardRateACL"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "gasguard-rate-rules"
    Environment = var.environment
    ManagedBy   = "terraform"
    Issue       = "1131"
  }
}

output "waf_rate_acl_arn" {
  description = "ARN of the WAF rate-based ACL"
  value       = aws_wafv2_web_acl.gasguard_rate_acl.arn
}

output "waf_rate_acl_id" {
  description = "ID of the WAF rate-based ACL"
  value       = aws_wafv2_web_acl.gasguard_rate_acl.id
}
