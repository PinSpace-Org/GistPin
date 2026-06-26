# RDS Read Replicas — connection routing and replication monitoring
# Depends on: rds.tf (aws_db_instance.postgres)

variable "replica_count" {
  description = "Number of read replicas"
  type        = number
  default     = 1
}

variable "replica_instance_class" {
  description = "Instance class for read replicas"
  type        = string
  default     = "db.t3.medium"
}

# ── Read replicas ─────────────────────────────────────────────────────────────
resource "aws_db_instance" "postgres_replica" {
  count = var.replica_count

  identifier          = "${var.project_name}-${var.environment}-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.postgres.identifier
  instance_class      = var.replica_instance_class
  publicly_accessible = false

  # Inherit encryption & monitoring from primary
  storage_encrypted  = true
  monitoring_interval = 60

  # Replica-specific: allow auto-promotion on failover
  auto_minor_version_upgrade = true
  skip_final_snapshot        = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Role        = "read-replica"
    Index       = tostring(count.index + 1)
  }
}

# ── Route53 CNAME for replica read endpoint ───────────────────────────────────
resource "aws_route53_record" "db_read" {
  count   = var.replica_count > 0 ? 1 : 0
  zone_id = data.aws_route53_zone.internal.zone_id
  name    = "db-read.${var.environment}.internal.${var.project_name}"
  type    = "CNAME"
  ttl     = 30
  records = [aws_db_instance.postgres_replica[0].address]
}

# ── CloudWatch alarms for replica lag ─────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  count = var.replica_count

  alarm_name          = "${var.project_name}-${var.environment}-replica-${count.index + 1}-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 30  # seconds

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres_replica[count.index].id
  }

  alarm_description = "Read replica lag > 30s for ${var.project_name} ${var.environment}"
  alarm_actions     = [aws_sns_topic.db_alerts.arn]
  ok_actions        = [aws_sns_topic.db_alerts.arn]

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_sns_topic" "db_alerts" {
  name = "${var.project_name}-${var.environment}-db-alerts"
  tags = { Environment = var.environment, Project = var.project_name }
}

# ── Outputs ───────────────────────────────────────────────────────────────────
output "replica_endpoints" {
  description = "Read replica endpoints"
  value       = [for r in aws_db_instance.postgres_replica : r.address]
}

output "db_read_cname" {
  description = "DNS CNAME for read endpoint"
  value       = var.replica_count > 0 ? aws_route53_record.db_read[0].fqdn : null
}
