# infrastructure/terraform/data-sources.tf
# External data sources for dynamic lookup of AMI, K8s versions, AZs, and certificates.

data "aws_ami" "app_ami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

data "aws_eks_server_version" "latest" {}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_acm_certificate" "issued" {
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}
