################################################################################
# Terraform Operation Tracing – distributed trace export for TF runs
################################################################################

variable "tracing_enabled" {
  description = "Enable distributed tracing for Terraform operations"
  type        = bool
  default     = true
}

variable "tracing_endpoint" {
  description = "OpenTelemetry-compatible endpoint for trace export"
  type        = string
  default     = "http://otel-collector.gistpin-prod:4318/v1/traces"
}

locals {
  tracing_tags = {
    Environment = var.environment
    Project     = var.project_name
    Component   = "terraform-tracing"
  }
}

resource "aws_cloudwatch_log_group" "tf_traces" {
  count             = var.tracing_enabled ? 1 : 0
  name              = "/aws/terraform/traces/${var.project_name}-${var.environment}"
  retention_in_days = 30

  tags = local.tracing_tags
}

resource "aws_cloudwatch_metric_alarm" "tf_trace_failures" {
  count               = var.tracing_enabled ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-tf-trace-exporter-failures"
  alarm_description   = "Terraform trace export failures detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TerraformTraceExportFailures"
  namespace           = "Terraform/Tracing"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.tf_tracing_alerts[0].arn]

  tags = local.tracing_tags
}

resource "aws_cloudwatch_metric_alarm" "tf_trace_latency" {
  count               = var.tracing_enabled ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-tf-trace-latency"
  alarm_description   = "Terraform trace export latency exceeded threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TerraformTraceExportLatency"
  namespace           = "Terraform/Tracing"
  period              = 60
  statistic           = "p95"
  threshold           = 5000
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.tf_tracing_alerts[0].arn]

  tags = local.tracing_tags
}

resource "aws_sns_topic" "tf_tracing_alerts" {
  count = var.tracing_enabled ? 1 : 0
  name  = "${var.project_name}-${var.environment}-tf-tracing-alerts"

  tags = local.tracing_tags
}

resource "aws_sns_topic_policy" "tf_tracing_alerts" {
  count = var.tracing_enabled ? 1 : 0
  arn   = aws_sns_topic.tf_tracing_alerts[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "TerraformTracingPublish"
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.tf_tracing_alerts[0].arn
    }]
  })
}

resource "aws_cloudwatch_dashboard" "tf_tracing" {
  count          = var.tracing_enabled ? 1 : 0
  dashboard_name = "${var.project_name}-${var.environment}-tf-tracing"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["Terraform/Tracing", "TerraformTraceExportFailures", { stat = "Sum" }],
            ["Terraform/Tracing", "TerraformTraceExportLatency", { stat = "p95" }],
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Terraform Tracing"
        }
      },
      {
        type = "log"
        properties = {
          query  = "SOURCE '/aws/terraform/traces/${var.project_name}-${var.environment}'"
          region = "us-east-1"
          title  = "Terraform Trace Logs"
        }
      }
    ]
  })
}
