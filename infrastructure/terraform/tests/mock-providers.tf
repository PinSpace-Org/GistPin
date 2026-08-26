terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "test"
      Project     = "gistpin"
      ManagedBy   = "terraform"
    }
  }

  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}

mock_provider "aws" {
  default_resources {
    mock_data "aws_caller_identity" {
      defaults = {
        account_id = "123456789012"
        arn        = "arn:aws:iam::123456789012:root"
      }
    }

    mock_data "aws_region" {
      defaults = {
        name = "us-east-1"
      }
    }

    mock_data "aws_availability_zones" {
      defaults = {
        names = ["us-east-1a", "us-east-1b", "us-east-1c"]
      }
    }

    mock_resource "aws_vpc" {
      defaults = {
        id                 = "vpc-mock-12345"
        cidr_block         = "10.0.0.0/16"
        enable_dns_support = true
      }
    }

    mock_resource "aws_subnet" {
      defaults = {
        id                = "subnet-mock-12345"
        availability_zone = "us-east-1a"
        vpc_id            = "vpc-mock-12345"
      }
    }

    mock_resource "aws_security_group" {
      defaults = {
        id   = "sg-mock-12345"
        name = "test-sg"
        vpc_id = "vpc-mock-12345"
      }
    }

    mock_resource "aws_db_subnet_group" {
      defaults = {
        id = "test-subnet-group"
      }
    }

    mock_resource "aws_iam_role" {
      defaults = {
        arn = "arn:aws:iam::123456789012:role/test-role"
        id  = "test-role"
      }
    }

    mock_resource "aws_kms_key" {
      defaults = {
        arn    = "arn:aws:kms:us-east-1:123456789012:key/test-key"
        id     = "test-key-id"
      }
    }

    mock_resource "aws_cloudwatch_log_group" {
      defaults = {
        arn  = "arn:aws:logs:us-east-1:123456789012:log-group:test"
        name = "test-log-group"
      }
    }
  }
}
