resource "aws_config_configuration_recorder" "main" {
  name     = "gistpin-config-recorder"
  role_arn = aws_iam_role.config.arn
}
resource "aws_config_delivery_channel" "main" {
  name           = "gistpin-config-channel"
  s3_bucket_name = aws_s3_bucket.config_logs.id
  sns_topic_arn  = aws_sns_topic.config_alerts.arn
}
resource "aws_config_configuration_recorder_status" "main" {
  name       = aws_config_configuration_recorder.main.name
  is_enabled = true
}
