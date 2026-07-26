# infrastructure/terraform/dynamic-config.tf
# Dynamic configurations consuming external data sources.

locals {
  selected_ami_id    = data.aws_ami.app_ami.id
  latest_k8s_version = data.aws_eks_server_version.latest.version
  primary_az_list    = data.aws_availability_zones.available.names
  certificate_arn    = data.aws_acm_certificate.issued.arn
}

output "dynamic_config_summary" {
  value = {
    ami_id          = local.selected_ami_id
    k8s_version     = local.latest_k8s_version
    available_azs   = local.primary_az_list
    certificate_arn = local.certificate_arn
  }
}
