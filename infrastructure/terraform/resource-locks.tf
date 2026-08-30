# Resource dependency locking.
# Terraform's built-in state lock serializes operations on a whole state file.
# This adds a finer-grained, cross-state lock so operations on *interdependent*
# resource groups (e.g. networking that a database depends on) can't run
# concurrently even when they live in different state files or workspaces.

# DynamoDB table holding the locks. A conditional PutItem on LockID is the
# atomic acquire; the TTL attribute auto-expires stale locks so a crashed
# process can't hold a lock forever.
resource "aws_dynamodb_table" "resource_locks" {
  name         = "${var.project_name}-${var.environment}-resource-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  ttl {
    attribute_name = "ExpiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "resource-dependency-locking"
  }
}

locals {
  # Dependency graph: each group lists the groups it depends on. The lock script
  # acquires locks for a group AND its transitive dependencies, always in a
  # fixed global order (see resource_lock_order) to prevent deadlock.
  resource_dependencies = {
    networking = []
    security   = ["networking"]
    database   = ["networking", "security"]
    compute    = ["networking", "security"]
    app        = ["database", "compute"]
  }

  # Global acquisition order. Locks are always taken in this order regardless of
  # which group is being operated on — a total order over lockable groups is
  # what guarantees deadlock freedom.
  resource_lock_order = ["networking", "security", "database", "compute", "app"]
}

output "resource_lock_table" {
  description = "DynamoDB table name used by acquire-resource-lock.sh"
  value       = aws_dynamodb_table.resource_locks.name
}

output "resource_dependency_graph" {
  description = "Resource group dependency graph and global lock order, as JSON"
  value = jsonencode({
    dependencies = local.resource_dependencies
    order        = local.resource_lock_order
  })
}
