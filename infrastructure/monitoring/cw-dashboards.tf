resource "aws_cloudwatch_dashboard" "container_insights" {
  count = var.enable_container_insights ? 1 : 0

  dashboard_name = "${var.project_name}-${var.environment}-container-insights"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        x      = 0
        y      = 0
        width  = 24
        height = 1
        properties = {
          markdown = "# Container Insights - ${aws_eks_cluster.main.name}"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "Pod CPU Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "CpuUtilized", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 1
        width  = 12
        height = 6
        properties = {
          title  = "Pod Memory Utilization"
          region = var.region
          metrics = [
            ["ContainerInsights", "MemoryUtilized", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "Network Receive Bytes"
          region = var.region
          metrics = [
            ["ContainerInsights", "NetworkRxBytes", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Sum", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 7
        width  = 12
        height = 6
        properties = {
          title  = "Network Transmit Bytes"
          region = var.region
          metrics = [
            ["ContainerInsights", "NetworkTxBytes", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Sum", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "Pod Count"
          region = var.region
          metrics = [
            ["ContainerInsights", "PodCount", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 13
        width  = 12
        height = 6
        properties = {
          title  = "Running Pod Count"
          region = var.region
          metrics = [
            ["ContainerInsights", "RunningPodCount", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "Container Restarts"
          region = var.region
          metrics = [
            ["ContainerInsights", "RestartCount", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Sum", period = 300 }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 19
        width  = 12
        height = 6
        properties = {
          title  = "Filesystem Usage"
          region = var.region
          metrics = [
            ["ContainerInsights", "FilesystemUsage", "ClusterName", aws_eks_cluster.main.name, "Namespace", "gistpin", { stat = "Average", period = 300 }]
          ]
          view = "timeSeries"
        }
      }
    ]
  })

  tags = { Environment = var.environment, Project = var.project_name }
}
