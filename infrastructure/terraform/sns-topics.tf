resource "aws_sns_topic" "gistpin_alerts" {
  name = "gistpin-alerts"
}

resource "aws_sns_topic_subscription" "gistpin_email" {
  topic_arn = aws_sns_topic.gistpin_alerts.arn
  protocol  = "email"
  endpoint  = "ops@gistpin.io"
}
