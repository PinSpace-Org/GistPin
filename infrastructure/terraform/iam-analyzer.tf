################################################################################
# IAM Access Analyzer – cross-account access analysis for GistPin
################################################################################

resource "aws_accessanalyzer_analyzer" "account" {
  analyzer_name = "${var.project_name}-${var.environment}-iam-analyzer"
  type          = "ACCOUNT"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "iam-access-analysis"
  }
}

resource "aws_accessanalyzer_archive_rule" "ignore_aws_service" {
  analyzer_name = aws_accessanalyzer_analyzer.account.analyzer_name
  rule_name     = "ignore-aws-service-roles"
  filter {
    criteria = "RESOURCE_TYPE"
    eq       = ["AWS::IAM::Role"]
  }
  filter {
    criteria = "RESOURCE_CONTROL_POLICY"
    exists   = "true"
  }
}

resource "aws_accessanalyzer_archive_rule" "ignore_service_linked" {
  analyzer_name = aws_accessanalyzer_analyzer.account.analyzer_name
  rule_name     = "ignore-service-linked-roles"
  filter {
    criteria = "RESOURCE_TYPE"
    eq       = ["AWS::IAM::ServiceLinkedRole"]
  }
}

resource "aws_cloudwatch_event_rule" "iam_analyzer_finding" {
  name        = "${var.project_name}-${var.environment}-iam-analyzer-finding"
  description = "Capture IAM Access Analyzer findings"

  event_pattern = jsonencode({
    source      = ["aws.access-analyzer"]
    detail-type = ["Access Analyzer Finding"]
  })
}

resource "aws_cloudwatch_event_target" "iam_analyzer_sns" {
  rule      = aws_cloudwatch_event_rule.iam_analyzer_finding.name
  arn       = aws_sns_topic.iam_analyzer_alerts.arn
  target_id = "IAMAnalyzerToSNS"
}

resource "aws_sns_topic" "iam_analyzer_alerts" {
  name = "${var.project_name}-${var.environment}-iam-analyzer-alerts"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "iam-analyzer-alerts"
  }
}

resource "aws_sns_topic_policy" "iam_analyzer_alerts" {
  arn = aws_sns_topic.iam_analyzer_alerts.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "IAMAnalyzerPublish"
      Effect    = "Allow"
      Principal = { Service = "events.amazonaws.com" }
      Action    = "SNS:Publish"
      Resource  = aws_sns_topic.iam_analyzer_alerts.arn
    }]
  })
}

resource "aws_cloudwatch_log_metric_filter" "iam_analyzer_external" {
  name           = "${var.project_name}-${var.environment}-iam-external-access"
  pattern        = "{ $.issueType = \"EXTERNAL_ACCESS\" }"
  log_group_name = aws_cloudwatch_log_group.iam_analyzer.name

  metric_transformation {
    name          = "ExternalAccessFindings"
    namespace     = "IAMAnalyzer"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_group" "iam_analyzer" {
  name              = "/aws/access-analyzer/${var.project_name}-${var.environment}"
  retention_in_days = 90

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cloudwatch_metric_alarm" "iam_analyzer_external" {
  alarm_name          = "${var.project_name}-${var.environment}-iam-external-access"
  alarm_description   = "External access detected by IAM Access Analyzer"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ExternalAccessFindings"
  namespace           = "IAMAnalyzer"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.iam_analyzer_alerts.arn]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}
