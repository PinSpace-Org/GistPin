# infrastructure/terraform/blue-green.tf
# Blue-green workspace strategy: defines the variables consumed by
# workspace-blue.tfvars / workspace-green.tfvars and wires the active slot into
# the ALB listener so the switch between blue and green is zero-downtime.

variable "active_workspace" {
  description = "The active blue-green slot (blue | green)"
  type        = string
  default     = "blue"
}

variable "stage_suffix" {
  description = "Stage suffix used to name the blue/green resources"
  type        = string
  default     = "blue"
}

variable "app_version" {
  description = "Application version deployed to the active slot"
  type        = string
  default     = "1.0.0"
}

variable "traffic_weight" {
  description = "Percentage of traffic routed to the active slot"
  type        = number
  default     = 0
}

variable "listener_forward" {
  description = "Target slot that the ALB listener should forward to (blue | green)"
  type        = string
  default     = "blue"
}

locals {
  slot_suffix = var.active_workspace == "green" ? "green" : "blue"
}

# The active target group is selected by the workspace variables above.
data "aws_lb_target_group" "active" {
  name = "${var.project_name}-${var.environment}-${local.slot_suffix}-tg"
}

# Keep the currently-active listener pinned to the active slot.
resource "aws_lb_listener_rule" "blue_green_switch" {
  count        = var.listener_forward == "green" ? 1 : 0
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.active.arn
  }

  condition {
    path_pattern {
      values = ["/*"]
    }
  }
}

output "active_slot" {
  description = "Which blue-green slot is currently active"
  value       = {
    active_workspace = var.active_workspace
    stage_suffix     = var.stage_suffix
    app_version      = var.app_version
    traffic_weight   = var.traffic_weight
  }
}
