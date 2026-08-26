variables {
  environment  = "test"
  project_name = "gistpin"
  region       = "us-east-1"
}

mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = {
      names = ["us-east-1a", "us-east-1b", "us-east-1c"]
    }
  }
}

mock_resource "aws_db_subnet_group" {
  defaults = {
    id = "test-subnet-group"
  }
}

mock_resource "aws_security_group" {
  defaults = {
    id = "test-security-group"
  }
}

run "validates_rds_engine" {
  command = plan

  variables {
    engine         = "postgres"
    engine_version = "16.1"
    instance_class = "db.r6g.large"
  }

  assert {
    condition     = var.engine == "postgres"
    error_message = "RDS engine must be postgres."
  }
}

run "validates_instance_class" {
  command = plan

  variables {
    instance_class = "db.r6g.large"
  }

  assert {
    condition     = can(regex("^db\\.", var.instance_class))
    error_message = "Instance class must start with 'db.'."
  }
}

run "validates_storage_encryption" {
  command = plan

  variables {
    storage_encrypted = true
  }

  assert {
    condition     = var.storage_encrypted == true
    error_message = "RDS storage must be encrypted."
  }
}

run "validates_backup_retention" {
  command = plan

  variables {
    backup_retention_period = 7
  }

  assert {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention must be at least 7 days."
  }
}

run "validates_multi_az" {
  command = plan

  variables {
    multi_az = true
  }

  assert {
    condition     = var.multi_az == true
    error_message = "Multi-AZ must be enabled for production."
  }
}

run "validates_deletion_protection" {
  command = plan

  variables {
    deletion_protection = true
  }

  assert {
    condition     = var.deletion_protection == true
    error_message = "Deletion protection must be enabled."
  }
}

run "validates_performance_insights" {
  command = plan

  variables {
    performance_insights_enabled = true
  }

  assert {
    condition     = var.performance_insights_enabled == true
    error_message = "Performance Insights must be enabled."
  }
}

run "validates_monitoring_interval" {
  command = plan

  variables {
    monitoring_interval = 60
  }

  assert {
    condition     = var.monitoring_interval >= 15
    error_message = "Enhanced monitoring interval must be at least 15 seconds."
  }
}
