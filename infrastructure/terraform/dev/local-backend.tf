# Local state backend for the dev overlay.
#
# Production uses a remote S3/DynamoDB backend (see ../backend-config.tf). Local
# development must never touch that state, so the dev overlay keeps state in a
# local file that is git-ignored. This makes local iteration fast and isolated —
# a botched local apply can never corrupt shared remote state.

terraform {
  backend "local" {
    # Relative to this directory; .gitignore excludes *.tfstate.
    path = "terraform.dev.tfstate"
  }
}

# Convenience outputs so a developer can confirm they are running against the
# local/mock stack rather than a real environment.
output "backend_mode" {
  description = "Confirms the dev overlay is using local state"
  value       = "local (${path.module}/terraform.dev.tfstate)"
}

output "mock_mode_active" {
  description = "Whether the AWS provider is pointed at LocalStack"
  value       = var.mock_mode
}
