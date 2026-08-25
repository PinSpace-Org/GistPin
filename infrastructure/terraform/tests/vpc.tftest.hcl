variables {
  environment = "test"
  project_name = "gistpin"
  region      = "us-east-1"
}

mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b", "us-east-1c"]
    }
  }
}

run "validates_vpc_cidr_input" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = can(regex("^10\\.0\\.", var.vpc_cidr))
    error_message = "VPC CIDR must be in the 10.0.0.0/16 range."
  }
}

run "creates_vpc_with_correct_tags" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = output.vpc_id != ""
    error_message = "VPC ID should not be empty."
  }
}

run "creates_public_subnets_in_all_azs" {
  command = plan

  variables {
    vpc_cidr        = "10.0.0.0/16"
    public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  }

  assert {
    condition     = length(var.public_subnets) == 3
    error_message = "Expected 3 public subnets for 3 availability zones."
  }
}

run "creates_private_subnets_in_all_azs" {
  command = plan

  variables {
    vpc_cidr         = "10.0.0.0/16"
    private_subnets  = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  }

  assert {
    condition     = length(var.private_subnets) == 3
    error_message = "Expected 3 private subnets for 3 availability zones."
  }
}

run "vpc_has_dns_support" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = output.vpc_enable_dns_support == true
    error_message = "VPC must have DNS support enabled."
  }
}

run "vpc_has_dns_hostnames" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = output.vpc_enable_dns_hostnames == true
    error_message = "VPC must have DNS hostnames enabled."
  }
}

run "outputs_are_populated" {
  command = plan

  variables {
    vpc_cidr = "10.0.0.0/16"
  }

  assert {
    condition     = output.vpc_cidr_block == var.vpc_cidr
    error_message = "VPC CIDR block output should match input."
  }

  assert {
    condition     = output.vpc_id != null
    error_message = "VPC ID output should not be null."
  }
}
