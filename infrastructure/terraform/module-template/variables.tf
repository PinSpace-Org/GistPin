# Module inputs. Every variable MUST carry a `description` — the module-docs
# validator (validate-module-docs.yml) fails a module whose variables lack one,
# because the README Inputs table is generated from these descriptions.

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project_name" {
  description = "Project name used as a prefix in resource names."
  type        = string
  default     = "gistpin"
}

variable "tags" {
  description = "Additional tags merged onto every resource this module creates."
  type        = map(string)
  default     = {}
}
