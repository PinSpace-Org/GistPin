resource "aws_config_remediation_configuration" "fix_public_s3" {
  config_rule_name = aws_config_config_rule.s3_public_read.name
  target_type      = "SSM_DOCUMENT"
  target_id        = "AWS-DisableS3BucketPublicReadWrite"
  automatic        = true
  maximum_automatic_attempts = 3
  retry_interval_seconds      = 60
}
