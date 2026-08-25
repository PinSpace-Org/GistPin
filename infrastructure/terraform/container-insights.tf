resource "aws_cloudwatch_metric_container_insights" "eks" {
  count = var.enable_container_insights ? 1 : 0

  cluster_name = aws_eks_cluster.main.name
  environment  = var.environment

  tags = { Environment = var.environment, Project = var.project_name }
}

variable "enable_container_insights" {
  description = "Enable Container Insights for EKS cluster"
  type        = bool
  default     = true
}

resource "aws_cloudwatch_log_group" "container_insights" {
  count             = var.enable_container_insights ? 1 : 0
  name              = "/aws/containerinsights/${aws_eks_cluster.main.name}"
  retention_in_days = 90
  kms_key_id        = aws_kms_key.cloudwatch.arn

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_kms_key" "cloudwatch" {
  description             = "KMS key for Container Insights log encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_kms_alias" "cloudwatch" {
  name          = "alias/${var.project_name}-${var.environment}-container-insights"
  target_key_id = aws_kms_key.cloudwatch.key_id
}

resource "aws_cloudwatch_metric_alarm" "container_cpu_high" {
  count               = var.enable_container_insights ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-container-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CpuUtilized"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Container CPU utilization exceeds 85%"
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_cloudwatch_metric_alarm" "container_memory_high" {
  count               = var.enable_container_insights ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-container-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilized"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Container memory utilization exceeds 85%"
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_cloudwatch_metric_alarm" "container_network_rx_high" {
  count               = var.enable_container_insights ? 1 : 0
  alarm_name          = "${var.project_name}-${var.environment}-container-network-rx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "NetworkRxBytes"
  namespace           = "ContainerInsights"
  period              = 300
  statistic           = "Sum"
  threshold           = 1073741824
  alarm_description   = "Container network receive bytes exceeds 1GB per 5min window"
  treat_missing_data  = "missing"

  dimensions = {
    ClusterName = aws_eks_cluster.main.name
  }

  tags = { Environment = var.environment, Project = var.project_name }
}
