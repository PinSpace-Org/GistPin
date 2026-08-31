# Module implementation goes here.
#
# Conventions:
#   - Merge var.tags with module-standard tags via local.tags below.
#   - Name resources "${var.project_name}-${var.environment}-<thing>".
#   - Every variable and output carries a description (see variables.tf/outputs.tf).

locals {
  tags = merge(
    {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
      Module      = "module-template"
    },
    var.tags,
  )
}

# Example resource (commented — this is a template):
#
# resource "aws_s3_bucket" "this" {
#   bucket = "${var.project_name}-${var.environment}-example"
#   tags   = local.tags
# }
