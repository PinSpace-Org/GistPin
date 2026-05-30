terraform {
  backend "s3" {
    bucket         = "gistpin-terraform-state"
    key            = "gistpin/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "gistpin-terraform-locks"
    encrypt        = true
  }
}
