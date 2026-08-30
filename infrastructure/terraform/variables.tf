variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"

  validation {
    # Constrain to the regions GistPin is approved to deploy in. Update this
    # list (and variable-validations.tf) when a new region is onboarded.
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], var.region)
    error_message = "region must be one of the approved regions: us-east-1, us-west-2, eu-west-1."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "gistpin"

  validation {
    # Lowercase, digits and hyphens only — used to build resource names that
    # must satisfy AWS naming rules (S3 buckets, IAM, etc.).
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-32 chars, lowercase alphanumeric and hyphens, not starting/ending with a hyphen."
  }
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string

  validation {
    condition     = can(regex("^vpc-[0-9a-f]{8,17}$", var.vpc_id))
    error_message = "vpc_id must be a valid VPC id (vpc-xxxxxxxx)."
  }
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string

  validation {
    # Must be a syntactically valid IPv4 CIDR...
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid IPv4 CIDR block (e.g. 10.0.0.0/16)."
  }

  validation {
    # ...and a private RFC 1918 range (defense against accidentally routing a
    # public range internally).
    condition     = can(regex("^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.)", var.vpc_cidr))
    error_message = "vpc_cidr must be within a private RFC 1918 range (10/8, 172.16/12, or 192.168/16)."
  }
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "private_subnet_ids must contain at least two subnets for high availability."
  }

  validation {
    condition     = alltrue([for id in var.private_subnet_ids : can(regex("^subnet-[0-9a-f]{8,17}$", id))])
    error_message = "each private subnet id must be a valid subnet id (subnet-xxxxxxxx)."
  }
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs"
  type        = list(string)

  validation {
    condition     = alltrue([for id in var.public_subnet_ids : can(regex("^subnet-[0-9a-f]{8,17}$", id))])
    error_message = "each public subnet id must be a valid subnet id (subnet-xxxxxxxx)."
  }
}

variable "tags" {
  description = "Common tags applied to all resources"
  type        = map(string)
  default     = {}

  validation {
    # Enforce the mandatory tag keys the organization requires for cost
    # allocation and ownership. Extra tags are allowed.
    condition = alltrue([
      for required in ["Environment", "Project", "Owner"] :
      contains(keys(var.tags), required)
    ])
    error_message = "tags must include the mandatory keys: Environment, Project, Owner."
  }

  validation {
    # Tag values must be non-empty (AWS accepts empty values, but they defeat
    # cost allocation and ownership lookups).
    condition     = alltrue([for v in values(var.tags) : length(trimspace(v)) > 0])
    error_message = "tag values must not be empty."
  }
}
