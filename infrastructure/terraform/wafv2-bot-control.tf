resource "aws_wafv2_rule_group" "soroban_rpc" {
  name     = "soroban-rpc-protection"
  scope    = "REGIONAL"
  capacity = 50
  rule {
    name     = "SorobanRPCRateLimit"
    priority = 1
    action { block {} }
    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SorobanRPCRateLimit"
      sampled_requests_enabled   = true
    }
  }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "soroban-rpc-protection"
    sampled_requests_enabled   = true
  }
}
