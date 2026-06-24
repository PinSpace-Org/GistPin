variable "environment" {
  description = "Ephemeral environment name (e.g. pr-123)"
  type        = string
}

variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "gistpin"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version"
  type        = string
  default     = "1.29"
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS nodes (keep small for ephemerals)"
  type        = string
  default     = "t3.medium"
}

variable "node_count" {
  description = "Number of EKS worker nodes"
  type        = number
  default     = 2
}
