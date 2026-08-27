###############################################################################
# AWS Systems Manager Maintenance Windows & Compliance
#
# Defines maintenance windows for scheduled patching, compliance
# reporting via AWS Config rules, and non-compliant instance alerts
# through CloudWatch and SNS.
###############################################################################

# ---------------------------------------------------------------------------
# Maintenance Window – Production Linux
# ---------------------------------------------------------------------------
resource "aws_ssm_maintenance_window" "prod_linux" {
  name              = "${local.common_tags.Project}-${local.common_tags.Environment}-prod-linux-mw"
  description       = "Weekly maintenance window for production Linux patching"
  schedule          = "cron(0 3 ? * SAT *)"   # Every Saturday at 03:00 UTC
  duration          = 4                         # 4-hour window
  cutoff            = 1                         # Stop new tasks 1 hour before end
  enabled           = true
  allow_unassociated_targets = false

  tags = merge(local.common_tags, {
    Name    = "${local.common_tags.Project}-${local.common_tags.Environment}-prod-linux-mw"
    Service = "ssm-patch-management"
  })
}

resource "aws_ssm_maintenance_window_target" "prod_linux" {
  window_id     = aws_ssm_maintenance_window.prod_linux.id
  name          = "${local.common_tags.Environment}-linux-patch-targets"
  description   = "EC2 instances tagged for Linux patching"
  resource_type = "INSTANCE"

  targets {
    key    = "tag:PatchGroup"
    values = ["${local.common_tags.Environment}-linux", "${local.common_tags.Environment}-ubuntu"]
  }
}

resource "aws_ssm_maintenance_window_task" "prod_linux_scan" {
  window_id        = aws_ssm_maintenance_window.prod_linux.id
  name             = "${local.common_tags.Environment}-linux-scan"
  description      = "Scan Linux instances for missing patches"
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  priority         = 1
  max_concurrency  = "50%"
  max_errors       = "25%"
  service_role_arn = aws_iam_role.ssm_maintenance_window.arn

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.prod_linux.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Scan"]
      }
    }
  }
}

resource "aws_ssm_maintenance_window_task" "prod_linux_install" {
  window_id        = aws_ssm_maintenance_window.prod_linux.id
  name             = "${local.common_tags.Environment}-linux-install"
  description      = "Install approved patches on Linux instances"
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  priority         = 2
  max_concurrency  = "25%"
  max_errors       = "10%"
  service_role_arn = aws_iam_role.ssm_maintenance_window.arn

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.prod_linux.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }
      parameter {
        name   = "RebootOption"
        values = ["RebootIfNeeded"]
      }
    }
  }
}

# ---------------------------------------------------------------------------
# Maintenance Window – Production Windows
# ---------------------------------------------------------------------------
resource "aws_ssm_maintenance_window" "prod_windows" {
  name              = "${local.common_tags.Project}-${local.common_tags.Environment}-prod-windows-mw"
  description       = "Weekly maintenance window for production Windows patching"
  schedule          = "cron(0 2 ? * SUN *)"   # Every Sunday at 02:00 UTC
  duration          = 5                         # 5-hour window (Windows patches take longer)
  cutoff            = 1
  enabled           = true
  allow_unassociated_targets = false

  tags = merge(local.common_tags, {
    Name    = "${local.common_tags.Project}-${local.common_tags.Environment}-prod-windows-mw"
    Service = "ssm-patch-management"
  })
}

resource "aws_ssm_maintenance_window_target" "prod_windows" {
  window_id     = aws_ssm_maintenance_window.prod_windows.id
  name          = "${local.common_tags.Environment}-windows-patch-targets"
  description   = "EC2 instances tagged for Windows patching"
  resource_type = "INSTANCE"

  targets {
    key    = "tag:PatchGroup"
    values = ["${local.common_tags.Environment}-windows"]
  }
}

resource "aws_ssm_maintenance_window_task" "prod_windows_scan" {
  window_id        = aws_ssm_maintenance_window.prod_windows.id
  name             = "${local.common_tags.Environment}-windows-scan"
  description      = "Scan Windows instances for missing patches"
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  priority         = 1
  max_concurrency  = "50%"
  max_errors       = "25%"
  service_role_arn = aws_iam_role.ssm_maintenance_window.arn

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.prod_windows.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Scan"]
      }
    }
  }
}

resource "aws_ssm_maintenance_window_task" "prod_windows_install" {
  window_id        = aws_ssm_maintenance_window.prod_windows.id
  name             = "${local.common_tags.Environment}-windows-install"
  description      = "Install approved patches on Windows instances"
  task_type        = "RUN_COMMAND"
  task_arn         = "AWS-RunPatchBaseline"
  priority         = 2
  max_concurrency  = "25%"
  max_errors       = "10%"
  service_role_arn = aws_iam_role.ssm_maintenance_window.arn

  targets {
    key    = "WindowTargetIds"
    values = [aws_ssm_maintenance_window_target.prod_windows.id]
  }

  task_invocation_parameters {
    run_command_parameters {
      parameter {
        name   = "Operation"
        values = ["Install"]
      }
      parameter {
        name   = "RebootOption"
        values = ["RebootIfNeeded"]
      }
    }
  }
}

# ---------------------------------------------------------------------------
# IAM Role for Maintenance Window Tasks
# ---------------------------------------------------------------------------
resource "aws_iam_role" "ssm_maintenance_window" {
  name = "${local.common_tags.Project}-${local.common_tags.Environment}-ssm-mw-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ssm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ssm_maintenance_window" {
  role       = aws_iam_role.ssm_maintenance_window.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonSSMMaintenanceWindowRole"
}

# ---------------------------------------------------------------------------
# Compliance Reporting – AWS Config Rule
# ---------------------------------------------------------------------------
resource "aws_config_config_rule" "managed_instance_patch_compliance" {
  name = "${local.common_tags.Project}-${local.common_tags.Environment}-patch-compliance"

  source {
    owner             = "AWS"
    source_identifier = "MANAGED_INSTANCE_PATCH_COMPLIANCE"
  }

  scope {
    compliance_resource_types = ["AWS::SSM::ManagedInstance"]
  }

  depends_on = [aws_config_configuration_recorder.main]

  tags = local.common_tags
}

# ---------------------------------------------------------------------------
# Non-Compliant Instance Alerts – CloudWatch + SNS
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "non_compliant_instances" {
  alarm_name          = "${local.common_tags.Project}-${local.common_tags.Environment}-patch-non-compliant"
  alarm_description   = "Alert when instances become non-compliant with patch baseline"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Custom:NonCompliantInstanceCount"
  namespace           = "Custom/SSMPatch"
  period              = 3600
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.patch_alerts.arn]
  ok_actions    = [aws_sns_topic.patch_alerts.arn]

  tags = merge(local.common_tags, {
    Service = "ssm-patch-management"
  })
}

resource "aws_cloudwatch_metric_alarm" "patch_scan_errors" {
  alarm_name          = "${local.common_tags.Project}-${local.common_tags.Environment}-patch-scan-errors"
  alarm_description   = "Alert on patch scan task failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Custom:PatchScanErrors"
  namespace           = "Custom/SSMPatch"
  period              = 86400
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.patch_alerts.arn]

  tags = merge(local.common_tags, {
    Service = "ssm-patch-management"
  })
}

resource "aws_sns_topic" "patch_alerts" {
  name = "${local.common_tags.Project}-${local.common_tags.Environment}-patch-alerts"

  tags = merge(local.common_tags, {
    Service = "ssm-patch-management"
  })
}

resource "aws_sns_topic_subscription" "patch_alerts_email" {
  topic_arn = aws_sns_topic.patch_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------
variable "alert_email" {
  description = "Email address for patch compliance alerts"
  type        = string
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------
output "maintenance_window_linux_id" {
  description = "Production Linux maintenance window ID"
  value       = aws_ssm_maintenance_window.prod_linux.id
}

output "maintenance_window_windows_id" {
  description = "Production Windows maintenance window ID"
  value       = aws_ssm_maintenance_window.prod_windows.id
}

output "patch_alerts_topic_arn" {
  description = "SNS topic ARN for patch compliance alerts"
  value       = aws_sns_topic.patch_alerts.arn
}
