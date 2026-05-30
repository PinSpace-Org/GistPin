resource "aws_cloudwatch_log_group" "gistpin" {
  name              = "/gistpin/app"
  retention_in_days = 30
}

resource "aws_cloudwatch_dashboard" "gistpin" {
  dashboard_name = "gistpin-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "CPU Utilization"
          metrics = [["AWS/ECS", "CPUUtilization", "ServiceName", "gistpin"]]
          period  = 300
          stat    = "Average"
        }
      }
    ]
  })
}
