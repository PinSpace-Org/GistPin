################################################################################
# GuardDuty – threat detection for GistPin AWS accounts
################################################################################

resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "threat-detection"
  }
}

# ---------------------------------------------------------------------------
# S3 Protection – monitor data access patterns
# ---------------------------------------------------------------------------
resource "aws_guardduty_detector_feature" "s3_protection" {
  detector_id = aws_guardduty_detector.main.id
  name        = "S3_DATA_EVENTS"
  status      = "ENABLED"
}

# ---------------------------------------------------------------------------
# EKS Protection – monitor Kubernetes audit logs
# ---------------------------------------------------------------------------
resource "aws_guardduty_detector_feature" "eks_protection" {
  detector_id = aws_guardduty_detector.main.id
  name        = "EKS_AUDIT_LOGS"
  status      = "ENABLED"

  additional_configuration {
    name  = "EKS_ADDON_MANAGEMENT"
    status = "ENABLED"
  }
}

# ---------------------------------------------------------------------------
# GuardDuty publishes findings to CloudWatch for alerting
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_event_rule" "guardduty_finding" {
  name        = "${var.project_name}-${var.environment}-guardduty-finding"
  description = "Capture GuardDuty findings for alerting"

  event_pattern = jsonencode({
    source      = ["aws.guardduty"]
    detail-type = ["GuardDuty Finding"]
  })
}

resource "aws_cloudwatch_event_target" "guardduty_sns" {
  rule      = aws_cloudwatch_event_rule.guardduty_finding.name
  arn       = aws_sns_topic.guardduty_alerts.arn
  target_id = "GuardDutyToSNS"
}

# ---------------------------------------------------------------------------
# SNS topics for severity-based alert routing
# ---------------------------------------------------------------------------
resource "aws_sns_topic" "guardduty_alerts" {
  name = "${var.project_name}-${var.environment}-guardduty-alerts"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "guardduty-alerts"
  }
}

resource "aws_sns_topic_policy" "guardduty_alerts" {
  arn = aws_sns_topic.guardduty_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "GuardDutyPublish"
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.guardduty_alerts.arn
    }]
  })
}

# ---------------------------------------------------------------------------
# CloudWatch metric filter for severity-based alerting
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_metric_filter" "guardduty_critical" {
  name           = "${var.project_name}-${var.environment}-guardduty-critical"
  pattern        = "{ $.severity >= 7 }"
  log_group_name = aws_cloudwatch_log_group.guardduty.name

  metric_transformation {
    name          = "CriticalFindings"
    namespace     = "GuardDuty"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "guardduty_high" {
  name           = "${var.project_name}-${var.environment}-guardduty-high"
  pattern        = "{ $.severity >= 4 && $.severity < 7 }"
  log_group_name = aws_cloudwatch_log_group.guardduty.name

  metric_transformation {
    name          = "HighFindings"
    namespace     = "GuardDuty"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "guardduty_medium" {
  name           = "${var.project_name}-${var.environment}-guardduty-medium"
  pattern        = "{ $.severity >= 1 && $.severity < 4 }"
  log_group_name = aws_cloudwatch_log_group.guardduty.name

  metric_transformation {
    name          = "MediumFindings"
    namespace     = "GuardDuty"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_group" "guardduty" {
  name              = "/aws/guardduty/${var.project_name}-${var.environment}"
  retention_in_days = 90

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ---------------------------------------------------------------------------
# CloudWatch alarms for severity-based escalation
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "guardduty_critical" {
  alarm_name          = "${var.project_name}-${var.environment}-guardduty-critical"
  alarm_description   = "Immediate response required — critical GuardDuty finding detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CriticalFindings"
  namespace           = "GuardDuty"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.guardduty_alerts.arn]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_metric_alarm" "guardduty_high" {
  alarm_name          = "${var.project_name}-${var.environment}-guardduty-high"
  alarm_description   = "High severity GuardDuty finding — investigate within business hours"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HighFindings"
  namespace           = "GuardDuty"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.guardduty_alerts.arn]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
