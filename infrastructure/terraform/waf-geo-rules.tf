# AWS WAF Geo-Based Rules & Bot Control (#1131)
# - aws_wafv2_web_acl_association: associate WAF ACL with ALB/API Gateway
# - geo_match_statement: block requests from specified countries
# - Managed rule group: AWS Bot Control

variable "blocked_countries" {
  description = "List of ISO 3166-1 alpha-2 country codes to block"
  type        = list(string)
  default     = ["KP", "IR", "SY", "CU"]  # North Korea, Iran, Syria, Cuba (OFAC)
}

variable "alb_arn" {
  description = "ARN of the Application Load Balancer to associate WAF with"
  type        = string
}

variable "waf_bot_priority" {
  description = "Priority for the bot control managed rule"
  type        = number
  default     = 10
}

# WAF ACL with geo-blocking and bot control managed rules
resource "aws_wafv2_web_acl" "gasguard_geo_acl" {
  name        = "gasguard-geo-bot-rules-${var.environment}"
  description = "WAF ACL with geo-blocking and AWS Bot Control for GasGuard"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Block requests from sanctioned/restricted countries
  rule {
    name     = "GeoBlockRestrictedCountries"
    priority = 1

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = var.blocked_countries
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Bot Control rule group
  rule {
    name     = "AWSManagedBotControl"
    priority = var.waf_bot_priority

    override_action {
      # Count mode first; switch to "none" to enforce blocking
      count {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesBotControlRuleSet"
        vendor_name = "AWS"

        managed_rule_group_config {
          aws_managed_rules_bot_control_rule_set {
            inspection_level = "COMMON"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BotControlManagedRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "GasGuardGeoACL"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "gasguard-geo-bot-rules"
    Environment = var.environment
    ManagedBy   = "terraform"
    Issue       = "1131"
  }
}

# Associate WAF ACL with the Application Load Balancer
resource "aws_wafv2_web_acl_association" "gasguard_alb_association" {
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.gasguard_geo_acl.arn
}

# Logging configuration — send WAF logs to CloudWatch or S3
resource "aws_wafv2_web_acl_logging_configuration" "gasguard_geo_logging" {
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]
  resource_arn            = aws_wafv2_web_acl.gasguard_geo_acl.arn

  logging_filter {
    default_behavior = "DROP"

    filter {
      behavior = "KEEP"
      condition {
        action_condition {
          action = "BLOCK"
        }
      }
      requirement = "MEETS_ANY"
    }
  }
}

resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "/aws/waf/gasguard-${var.environment}"
  retention_in_days = 30

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "waf_geo_acl_arn" {
  description = "ARN of the WAF geo/bot control ACL"
  value       = aws_wafv2_web_acl.gasguard_geo_acl.arn
}
