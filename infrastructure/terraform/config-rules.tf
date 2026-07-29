resource "aws_config_config_rule" "encrypted_ebs" {
  name = "encrypted-ebs-volumes"
  source { owner = "AWS", source_identifier = "ENCRYPTED_VOLUMES" }
}
resource "aws_config_config_rule" "s3_public_read" {
  name = "s3-bucket-public-read-prohibited"
  source { owner = "AWS", source_identifier = "S3_BUCKET_PUBLIC_READ_PROHIBITED" }
}
resource "aws_config_config_rule" "s3_mfa_delete" {
  name = "s3-bucket-mfa-delete-enabled"
  source { owner = "AWS", source_identifier = "S3_BUCKET_MFA_DELETE_ENABLED" }
}
resource "aws_config_config_rule" "restricted_ssh" {
  name = "restricted-ssh"
  source { owner = "AWS", source_identifier = "INCOMING_SSH_DISABLED" }
}
