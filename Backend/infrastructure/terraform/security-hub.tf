############################################
# AWS Security Hub - Compliance Aggregation
#
# Implements:
#   - Security Hub enablement
#   - CIS AWS Foundations Benchmark standard
#   - Cross-region / cross-account finding aggregation
#   - Automated remediation for common findings (EventBridge -> Lambda)
#   - Weekly compliance report (EventBridge scheduled -> Lambda -> S3/SNS/SES)
############################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = ">= 2.4.0"
    }
  }
}

############################################
# Variables
############################################

variable "aggregator_region" {
  description = "Region where findings from all linked regions will be aggregated."
  type        = string
  default     = "us-east-1"
}

variable "linked_regions" {
  description = "List of regions to link into the finding aggregator. Empty list = all regions."
  type        = list(string)
  default     = []
}

variable "enable_cis_standard" {
  description = "Enable the CIS AWS Foundations Benchmark standard."
  type        = bool
  default     = true
}

variable "cis_standard_version" {
  description = "Version of the CIS AWS Foundations Benchmark to subscribe to."
  type        = string
  default     = "1.4.0"
}

variable "enable_auto_remediation" {
  description = "Whether to wire up EventBridge -> Lambda automated remediation for supported finding types."
  type        = bool
  default     = true
}

variable "remediation_finding_types" {
  description = "Security Hub finding generator IDs / rule identifiers that trigger auto-remediation."
  type        = list(string)
  default = [
    "aws-foundational-security-best-practices/v/1.0.0/S3.8",   # S3 Block Public Access
    "aws-foundational-security-best-practices/v/1.0.0/EC2.19", # Unrestricted SG (0.0.0.0/0 on high-risk ports)
    "aws-foundational-security-best-practices/v/1.0.0/IAM.6",  # Hardware MFA for root
    "cis-aws-foundations-benchmark/v/1.4.0/1.12",              # Root account use
    "cis-aws-foundations-benchmark/v/1.4.0/2.1.1",             # S3 bucket encryption
  ]
}

variable "compliance_report_schedule" {
  description = "EventBridge schedule expression for the weekly compliance report."
  type        = string
  default     = "cron(0 8 ? * MON *)" # Every Monday 08:00 UTC
}

variable "notification_email" {
  description = "Email address (SNS/SES) that receives the weekly compliance report and remediation alerts."
  type        = string
}

variable "report_bucket_name" {
  description = "S3 bucket name for storing weekly compliance reports. Must be globally unique."
  type        = string
}

variable "tags" {
  description = "Common tags applied to all resources."
  type        = map(string)
  default = {
    Project   = "GistPin"
    ManagedBy = "terraform"
    Component = "security-hub"
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

############################################
# 1. Security Hub Enablement
############################################

resource "aws_securityhub_account" "this" {
  enable_default_standards = false # we control which standards are subscribed explicitly below
  control_finding_generator = "SECURITY_CONTROL"
  auto_enable_controls      = true
}

############################################
# 2. CIS AWS Foundations Benchmark
############################################

resource "aws_securityhub_standards_subscription" "cis" {
  count         = var.enable_cis_standard ? 1 : 0
  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/cis-aws-foundations-benchmark/v/${var.cis_standard_version}"

  depends_on = [aws_securityhub_account.this]
}

# AWS Foundational Security Best Practices - complements CIS, needed by several
# of the auto-remediation rules referenced above.
resource "aws_securityhub_standards_subscription" "fsbp" {
  standards_arn = "arn:${data.aws_partition.current.partition}:securityhub:${data.aws_region.current.name}::standards/aws-foundational-security-best-practices/v/1.0.0"

  depends_on = [aws_securityhub_account.this]
}

############################################
# 3. Finding Aggregation (cross-region)
############################################

resource "aws_securityhub_finding_aggregator" "this" {
  linking_mode = length(var.linked_regions) > 0 ? "SPECIFIED_REGIONS" : "ALL_REGIONS"

  # specified_regions is only used when linking_mode == SPECIFIED_REGIONS
  specified_regions = length(var.linked_regions) > 0 ? var.linked_regions : null

  depends_on = [aws_securityhub_account.this]
}

############################################
# 4. Automated Remediation
#    EventBridge rule matches Security Hub findings (NEW/NOTIFIED, non-passed)
#    for the configured finding types and invokes a remediation Lambda, which
#    shells out to the logic in remediate-findings.sh.
############################################

resource "aws_sns_topic" "security_alerts" {
  name = "security-hub-remediation-alerts"
  tags = var.tags
}

resource "aws_sns_topic_subscription" "security_alerts_email" {
  topic_arn = aws_sns_topic.security_alerts.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

data "archive_file" "remediation_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/remediation"
  output_path = "${path.module}/build/remediation.zip"
}

resource "aws_iam_role" "remediation_lambda" {
  name = "security-hub-remediation-lambda"
  tags = var.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "remediation_lambda" {
  name = "security-hub-remediation-permissions"
  role = aws_iam_role.remediation_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid    = "SecurityHubReadWrite"
        Effect = "Allow"
        Action = [
          "securityhub:GetFindings",
          "securityhub:BatchUpdateFindings"
        ]
        Resource = "*"
      },
      {
        Sid    = "RemediationActions"
        Effect = "Allow"
        Action = [
          "s3:PutBucketPublicAccessBlock",
          "s3:PutEncryptionConfiguration",
          "s3:GetBucketPolicy",
          "ec2:DescribeSecurityGroups",
          "ec2:RevokeSecurityGroupIngress",
          "iam:GetAccountSummary",
          "iam:UpdateAccountPasswordPolicy"
        ]
        Resource = "*"
      },
      {
        Sid      = "Notify"
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.security_alerts.arn
      }
    ]
  })
}

resource "aws_lambda_function" "remediation" {
  count            = var.enable_auto_remediation ? 1 : 0
  function_name    = "security-hub-auto-remediation"
  role             = aws_iam_role.remediation_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  timeout          = 60
  filename         = data.archive_file.remediation_lambda.output_path
  source_code_hash = data.archive_file.remediation_lambda.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.security_alerts.arn
    }
  }

  tags = var.tags
}

resource "aws_cloudwatch_event_rule" "remediation_trigger" {
  count       = var.enable_auto_remediation ? 1 : 0
  name        = "security-hub-findings-remediation"
  description = "Routes new/updated Security Hub findings of known types to the remediation Lambda."

  event_pattern = jsonencode({
    source      = ["aws.securityhub"]
    detail-type = ["Security Hub Findings - Imported"]
    detail = {
      findings = {
        Compliance = {
          Status = ["FAILED", "WARNING"]
        }
        RecordState = ["ACTIVE"]
        Workflow = {
          Status = ["NEW", "NOTIFIED"]
        }
        GeneratorId = var.remediation_finding_types
      }
    }
  })

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "remediation_lambda_target" {
  count     = var.enable_auto_remediation ? 1 : 0
  rule      = aws_cloudwatch_event_rule.remediation_trigger[0].name
  target_id = "security-hub-remediation-lambda"
  arn       = aws_lambda_function.remediation[0].arn
}

resource "aws_lambda_permission" "allow_eventbridge_remediation" {
  count         = var.enable_auto_remediation ? 1 : 0
  statement_id  = "AllowEventBridgeInvokeRemediation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.remediation[0].function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.remediation_trigger[0].arn
}

############################################
# 5. Weekly Compliance Report
#    Scheduled EventBridge rule -> Lambda that queries Security Hub,
#    renders a report, stores it in S3, and emails/publishes a summary.
############################################

resource "aws_s3_bucket" "compliance_reports" {
  bucket = var.report_bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "compliance_reports" {
  bucket                  = aws_s3_bucket.compliance_reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "compliance_reports" {
  bucket = aws_s3_bucket.compliance_reports.id

  rule {
    id     = "expire-old-reports"
    status = "Enabled"
    expiration {
      days = 365
    }
  }
}

data "archive_file" "report_lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda/compliance-report"
  output_path = "${path.module}/build/compliance-report.zip"
}

resource "aws_iam_role" "report_lambda" {
  name = "security-hub-compliance-report-lambda"
  tags = var.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "report_lambda" {
  name = "security-hub-compliance-report-permissions"
  role = aws_iam_role.report_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:${data.aws_partition.current.partition}:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid      = "SecurityHubRead"
        Effect   = "Allow"
        Action   = ["securityhub:GetFindings", "securityhub:GetInsights"]
        Resource = "*"
      },
      {
        Sid      = "ReportBucket"
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.compliance_reports.arn}/*"
      },
      {
        Sid      = "Notify"
        Effect   = "Allow"
        Action   = "sns:Publish"
        Resource = aws_sns_topic.security_alerts.arn
      }
    ]
  })
}

resource "aws_lambda_function" "compliance_report" {
  function_name    = "security-hub-weekly-compliance-report"
  role             = aws_iam_role.report_lambda.arn
  handler          = "index.handler"
  runtime          = "python3.12"
  timeout          = 120
  filename         = data.archive_file.report_lambda.output_path
  source_code_hash = data.archive_file.report_lambda.output_base64sha256

  environment {
    variables = {
      REPORT_BUCKET = aws_s3_bucket.compliance_reports.bucket
      SNS_TOPIC_ARN = aws_sns_topic.security_alerts.arn
    }
  }

  tags = var.tags
}

resource "aws_cloudwatch_event_rule" "weekly_report_schedule" {
  name                = "security-hub-weekly-compliance-report"
  description         = "Triggers the weekly Security Hub compliance report generation."
  schedule_expression = var.compliance_report_schedule
  tags                = var.tags
}

resource "aws_cloudwatch_event_target" "weekly_report_target" {
  rule      = aws_cloudwatch_event_rule.weekly_report_schedule.name
  target_id = "security-hub-weekly-report-lambda"
  arn       = aws_lambda_function.compliance_report.arn
}

resource "aws_lambda_permission" "allow_eventbridge_report" {
  statement_id  = "AllowEventBridgeInvokeReport"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.compliance_report.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_report_schedule.arn
}

############################################
# Outputs
############################################

output "security_hub_account_id" {
  value = aws_securityhub_account.this.id
}

output "finding_aggregator_arn" {
  value = aws_securityhub_finding_aggregator.this.arn
}

output "remediation_lambda_arn" {
  value = var.enable_auto_remediation ? aws_lambda_function.remediation[0].arn : null
}

output "compliance_report_bucket" {
  value = aws_s3_bucket.compliance_reports.bucket
}

output "security_alerts_topic_arn" {
  value = aws_sns_topic.security_alerts.arn
}
