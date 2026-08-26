terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "gistpin-terraform-state"
    key            = "compositions/full-stack/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
      Composition = "full-stack"
    }
  }
}

module "vpc" {
  source = "../../terraform"

  environment  = var.environment
  project_name = var.project_name
  region       = var.region
  vpc_cidr     = var.vpc_cidr
}

module "eks" {
  source = "../../terraform"

  environment        = var.environment
  project_name       = var.project_name
  region             = var.region
  private_subnet_ids = module.vpc.private_subnet_ids
  public_subnet_ids  = module.vpc.public_subnet_ids
  vpc_id             = module.vpc.vpc_id

  depends_on = [module.vpc]
}

module "rds" {
  source = "../../terraform"

  environment        = var.environment
  project_name       = var.project_name
  region             = var.region
  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id

  depends_on = [module.vpc]
}

module "monitoring" {
  source = "../../terraform"

  environment  = var.environment
  project_name = var.project_name
  region       = var.region
  cluster_name = module.eks.cluster_name

  depends_on = [module.eks]
}

module "security" {
  source = "../../terraform"

  environment  = var.environment
  project_name = var.project_name
  region       = var.region
  vpc_id       = module.vpc.vpc_id

  depends_on = [module.vpc]
}

# Conditional module inclusion example
module "gpu_nodes" {
  source = "../../terraform"
  count  = var.enable_gpu ? 1 : 0

  environment  = var.environment
  project_name = var.project_name
  region       = var.region

  depends_on = [module.eks]
}

variable "enable_gpu" {
  description = "Enable GPU node pool"
  type        = bool
  default     = false
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gistpin"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "monitoring_dashboard" {
  value = module.monitoring.dashboard_url
}
