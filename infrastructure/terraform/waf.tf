# WAF for application protection
resource "aws_wafv2_web_acl" "app_waf" {
  name  = "${var.app_name}-${var.environment}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.app_name}-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

variable "app_name" {
  type    = string
  default = "gistpin"
}

variable "environment" {
  type    = string
  default = "dev"
}

output "waf_arn" {
  value = aws_wafv2_web_acl.app_waf.arn
}