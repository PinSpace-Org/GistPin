# Terraform Module Registry Configuration
# Provisions a private Terraform registry using AWS CodeArtifact

locals {
  registry_domain = "gistpin"
  registry_repo   = "terraform-modules"
}

resource "aws_codeartifact_domain" "terraform_modules" {
  domain = local.registry_domain
}

resource "aws_codeartifact_repository" "terraform_modules" {
  repository  = local.registry_repo
  domain      = aws_codeartifact_domain.terraform_modules.domain
  description = "Private Terraform module registry for GistPin infrastructure"
}

resource "aws_codeartifact_repository_permissions_policy" "terraform_modules" {
  repository  = aws_codeartifact_repository.terraform_modules.repository
  domain      = aws_codeartifact_domain.terraform_modules.domain

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = { AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action = [
          "codeartifact:GetPackageVersionAsset",
          "codeartifact:ListPackageVersionAssets",
          "codeartifact:ListPackageVersions",
          "codeartifact:ListPackages",
          "codeartifact:ReadFromRepository",
          "codeartifact:PublishPackageVersion"
        ]
        Resource = "*"
      }
    ]
  })
}

data "aws_caller_identity" "current" {}

output "registry_endpoint" {
  description = "Terraform module registry endpoint"
  value       = "https://${local.registry_domain}-${data.aws_caller_identity.current.account_id}.d.codeartifact.${var.aws_region}.amazonaws.com/generic/${local.registry_repo}/"
}
