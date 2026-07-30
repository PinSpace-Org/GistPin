################################################################################
# Boundary Targets – secure remote access via HashiCorp Boundary
################################################################################

variable "boundary_controller_address" {
  description = "Boundary controller API address"
  type        = string
  default     = "http://boundary-controller.boundary:9200"
}

variable "boundary_auth_method_id" {
  description = "Boundary auth method ID for target management"
  type        = string
  default     = ""
}

locals {
  boundary_tags = {
    Environment = var.environment
    Project     = var.project_name
    Component   = "boundary-targets"
  }
}

resource "boundary_scope" "project" {
  name                     = "${var.project_name}-${var.environment}"
  description              = "GistPin ${var.environment} project scope"
  scope_id                 = "global"
  auto_create_admin_role   = true
  auto_create_default_role = true
}

resource "boundary_auth_method" "password" {
  name     = "${var.project_name}-${var.environment}-auth"
  type     = "password"
  scope_id = boundary_scope.project.id
}

resource "boundary_account" "password_admin" {
  name           = "boundary-admin-${var.environment}"
  type           = "password"
  login_name     = "admin"
  password       = var.boundary_admin_password
  auth_method_id = boundary_auth_method.password.id
}

resource "boundary_user" "admin" {
  name     = "admin-${var.environment}"
  scope_id = boundary_scope.project.id
}

resource "boundary_role" "admin" {
  name        = "admin-role-${var.environment}"
  description = "Admin role with full access"
  scope_id    = boundary_scope.project.id
  grant_strings = [
    "id=*;type=*;actions=*"
  ]
  principal_ids = [boundary_user.admin.id]
}

# ── SSH target for bastion hosts ────────────────────────────────────────
resource "boundary_target" "ssh_bastion" {
  name         = "${var.project_name}-${var.environment}-ssh-bastion"
  description  = "SSH access to EC2 bastion hosts"
  type         = "ssh"
  scope_id     = boundary_scope.project.id
  default_port = 22
  host_source_ids = [
    boundary_host_set.ec2_bastion.id
  ]
  brokered_credential_source_ids = []
}

resource "boundary_host_set" "ec2_bastion" {
  name        = "${var.project_name}-${var.environment}-ec2-bastion"
  description = "EC2 bastion hosts"
  type        = "static"
  scope_id    = boundary_scope.project.id
}

resource "boundary_host" "ec2_bastion_1" {
  name        = "${var.project_name}-${var.environment}-bastion-1"
  type        = "static"
  scope_id    = boundary_scope.project.id
  host_set_id = boundary_host_set.ec2_bastion.id
  address     = var.bastion_host_1_address
}

resource "boundary_host" "ec2_bastion_2" {
  name        = "${var.project_name}-${var.environment}-bastion-2"
  type        = "static"
  scope_id    = boundary_scope.project.id
  host_set_id = boundary_host_set.ec2_bastion.id
  address     = var.bastion_host_2_address
}

# ── PostgreSQL target ───────────────────────────────────────────────────
resource "boundary_target" "postgres" {
  name         = "${var.project_name}-${var.environment}-postgres"
  description  = "PostgreSQL database access"
  type         = "tcp"
  scope_id     = boundary_scope.project.id
  default_port = 5432
  host_source_ids = [
    boundary_host_set.postgres.id
  ]
}

resource "boundary_host_set" "postgres" {
  name        = "${var.project_name}-${var.environment}-postgres"
  description = "PostgreSQL RDS instances"
  type        = "static"
  scope_id    = boundary_scope.project.id
}

resource "boundary_host" "postgres_primary" {
  name        = "${var.project_name}-${var.environment}-postgres-primary"
  type        = "static"
  scope_id    = boundary_scope.project.id
  host_set_id = boundary_host_set.postgres.id
  address     = var.postgres_host_address
}

# ── Kubernetes API target ───────────────────────────────────────────────
resource "boundary_target" "kubernetes_api" {
  name         = "${var.project_name}-${var.environment}-kubernetes-api"
  description  = "Kubernetes API server access"
  type         = "tcp"
  scope_id     = boundary_scope.project.id
  default_port = 443
  host_source_ids = [
    boundary_host_set.kubernetes_api.id
  ]
}

resource "boundary_host_set" "kubernetes_api" {
  name        = "${var.project_name}-${var.environment}-kubernetes-api"
  description = "Kubernetes API endpoints"
  type        = "static"
  scope_id    = boundary_scope.project.id
}

resource "boundary_host" "kubernetes_api_endpoint" {
  name        = "${var.project_name}-${var.environment}-k8s-api"
  type        = "static"
  scope_id    = boundary_scope.project.id
  host_set_id = boundary_host_set.kubernetes_api.id
  address     = var.kubernetes_api_endpoint
}

# ── Outputs ─────────────────────────────────────────────────────────────
output "boundary_project_id" {
  value = boundary_scope.project.id
}

output "boundary_target_ssh_id" {
  value = boundary_target.ssh_bastion.id
}

output "boundary_target_postgres_id" {
  value = boundary_target.postgres.id
}

output "boundary_target_k8s_id" {
  value = boundary_target.kubernetes_api.id
}
