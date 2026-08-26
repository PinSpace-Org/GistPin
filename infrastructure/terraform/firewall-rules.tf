resource "aws_networkfirewall_rule_group" "ip_allowlist" {
  capacity = 100
  name     = "${var.project_name}-${var.environment}-ip-allowlist"
  type     = "STATELESS"

  rule_group {
    rules_source {
      stateless_rules_and_custom_actions {
        stateless_rule {
          priority = 1
          rule_definition {
            match_attributes {
              source {
                address_definition = var.vpc_cidr
              }
              destination {
                address_definition = "0.0.0.0/0"
              }
              protocols = [6]
              destination_ports {
                from_port = 443
                to_port   = 443
              }
              destination_ports {
                from_port = 80
                to_port   = 80
              }
            }
            actions {
              custom_action {
                action_definition {
                  publish_metric_action {
                    dimension {
                      value = "Allowed"
                    }
                  }
                }
                action_name = "MetricDrop"
              }
            }
          }
        }

        stateless_rule {
          priority = 2
          rule_definition {
            match_attributes {
              source {
                address_definition = "0.0.0.0/0"
              }
              destination {
                address_definition = var.vpc_cidr
              }
            }
            actions {
              custom_action {
                action_definition {
                  publish_metric_action {
                    dimension {
                      value = "Blocked"
                    }
                  }
                }
                action_name = "MetricBlock"
              }
            }
          }
        }
      }
    }
  }

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_networkfirewall_rule_group" "protocol_allowlist" {
  capacity = 50
  name     = "${var.project_name}-${var.environment}-protocol-allowlist"
  type     = "STATELESS"

  rule_group {
    rules_source {
      stateless_rules_and_custom_actions {
        stateless_rule {
          priority = 1
          rule_definition {
            match_attributes {
              protocols = [6, 17]
              source_ports {
                from_port = 1024
                to_port   = 65535
              }
              destination_ports {
                from_port = 443
                to_port   = 443
              }
            }
            actions = ["aws:forward_to_sfe"]
          }
        }

        stateless_rule {
          priority = 2
          rule_definition {
            match_attributes {
              protocols = [17]
              destination_ports {
                from_port = 53
                to_port   = 53
              }
            }
            actions = ["aws:forward_to_sfe"]
          }
        }

        stateless_rule {
          priority = 3
          rule_definition {
            match_attributes {
              protocols = [1]
              source_ports {
                from_port = 0
                to_port   = 0
              }
              destination_ports {
                from_port = 0
                to_port   = 0
              }
            }
            actions = ["aws:forward_to_sfe"]
          }
        }
      }
    }
  }

  tags = { Environment = var.environment, Project = var.project_name }
}
