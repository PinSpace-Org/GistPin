# Terraform Dynamic Blocks — DRY security group and tag configurations

# ------------------------------------------------------------------
# Reusable locals for ingress rules (replaces repetitive ingress blocks)
# ------------------------------------------------------------------
locals {
  # Define all ingress rules as a list — dynamic block iterates over this
  app_ingress_rules = [
    { port = 3000, description = "Backend API",     source_sg = "alb" },
    { port = 8080, description = "Health endpoint", source_sg = "alb" },
    { port = 9090, description = "Metrics scrape",  source_sg = "monitoring" },
  ]

  # Tag map applied to all resources via dynamic block
  resource_tags = merge(
    local.common_tags,
    {
      ManagedBy  = "terraform"
      UpdatedAt  = timestamp()
    }
  )
}

# ------------------------------------------------------------------
# Security group using dynamic ingress blocks (replaces repeated ingress{} stanzas)
# ------------------------------------------------------------------
resource "aws_security_group" "app_dynamic" {
  name        = "${var.project_name}-${var.environment}-app-dynamic-sg"
  description = "Application SG managed with dynamic blocks"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = local.app_ingress_rules
    content {
      from_port       = ingress.value.port
      to_port         = ingress.value.port
      protocol        = "tcp"
      security_groups = [aws_security_group.alb.id]
      description     = ingress.value.description
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound"
  }

  tags = local.common_tags
}
