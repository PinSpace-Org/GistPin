resource "aws_networkfirewall_firewall" "egress" {
  name                = "${var.project_name}-${var.environment}-egress-firewall"
  firewall_policy_arn = aws_networkfirewall_firewall_policy.egress.arn
  vpc_id              = var.vpc_id

  subnet_mapping {
    subnet_id = var.private_subnet_ids[0]
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_networkfirewall_firewall_policy" "egress" {
  name = "${var.project_name}-${var.environment}-egress-policy"

  firewall_policy {
    stateless_default_actions          = ["aws:forward_to_sfe"]
    stateless_fragment_default_actions = ["aws:forward_to_sfe"]

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.domain_allowlist.arn
      priority     = 1
    }

    stateful_rule_group_reference {
      resource_arn = aws_networkfirewall_rule_group.tls_inspection.arn
      priority     = 2
    }

    policy_variables {
      rule_variables {
        key = "HOME_NET"
        ip_set {
          definition = [var.vpc_cidr]
        }
      }

      rule_variables {
        key = "EXTERNAL_NET"
        ip_set {
          definition = ["0.0.0.0/0"]
        }
      }
    }
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_networkfirewall_rule_group" "domain_allowlist" {
  capacity = 100
  name     = "${var.project_name}-${var.environment}-domain-allowlist"
  type     = "STATEFUL"

  rule_group {
    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = [var.vpc_cidr]
        }
      }
    }

    rules_source {
      rules_source_list {
        generated_rules_type = "ALLOWLIST"
        target_types         = ["TLS_SNI", "HTTP_HOST"]
        targets = [
          ".github.com",
          ".docker.io",
          ".ghcr.io",
          ".amazonaws.com",
          ".cloudfront.net",
          ".googleapis.com",
          "registry.npmjs.org",
          "api.stripe.com",
          "*.sentry.io",
        ]
      }
    }

    stateful_action_order = "DEFAULT_ACTION_ORDER"
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_networkfirewall_rule_group" "tls_inspection" {
  capacity = 50
  name     = "${var.project_name}-${var.environment}-tls-inspection"
  type     = "STATEFUL"

  rule_group {
    rule_variables {
      ip_sets {
        key = "HOME_NET"
        ip_set {
          definition = [var.vpc_cidr]
        }
      }
    }

    rules_source {
      rules_source {
        stateful_rule {
          action = "PASS"
          header {
            protocol    = "TCP"
            source      = "HOME_NET"
            source_port = "ANY"
            direction   = "FORWARD"
            destination      = "EXTERNAL_NET"
            destination_port = "443"
          }

          rule_option {
            keyword = "flow:established"
          }

          rule_option {
            keyword = "tls.sni"
            settings {
              value = ".amazonaws.com"
            }
          }
        }
      }
    }

    stateful_action_order = "DEFAULT_ACTION_ORDER"
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_networkfirewall_logging_configuration" "egress" {
  firewall_arn = aws_networkfirewall_firewall.egress.arn

  logging_configuration {
    log_destination_configs = [
      aws_cloudwatch_log_group.firewall.arn,
      aws_cloudwatch_log_group.alert_log.arn,
    ]
  }
}

resource "aws_cloudwatch_log_group" "firewall" {
  name              = "/aws/networkfirewall/${var.project_name}-${var.environment}"
  retention_in_days = 90

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_cloudwatch_log_group" "alert_log" {
  name              = "/aws/networkfirewall/${var.project_name}-${var.environment}/alerts"
  retention_in_days = 90

  tags = { Environment = var.environment, Project = var.project_name }
}

variable "vpc_id" {
  description = "VPC ID for the firewall"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for firewall deployment"
  type        = list(string)
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}
