variable "environment" {
  description = "Deployment environment"
  type        = string
}
variable "vpc_cidr" {
  description = "VPC CIDR block per environment"
  type        = map(string)
  default = {
    production = "10.0.0.0/16"
    staging    = "10.1.0.0/16"
  }
}
