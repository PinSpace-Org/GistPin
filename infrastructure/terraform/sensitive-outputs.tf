# Terraform Sensitive Output Masking (#1133)
# All outputs containing secrets, credentials, or private keys MUST be marked
# with sensitive = true to prevent values from appearing in plan/apply output,
# state files display, or CI/CD logs.

# ─── Database Credentials ────────────────────────────────────────────────────

output "db_password" {
  description = "Database master password. Sensitive — never log or display this value."
  value       = var.db_password
  sensitive   = true
}

output "db_connection_string" {
  description = "Full database connection string including credentials."
  value       = "postgresql://${var.db_username}:${var.db_password}@${var.db_host}:${var.db_port}/${var.db_name}"
  sensitive   = true
}

# ─── API Keys ────────────────────────────────────────────────────────────────

output "api_key" {
  description = "GasGuard API key for service-to-service authentication."
  value       = var.api_key
  sensitive   = true
}

output "internal_api_secret" {
  description = "Internal API secret used for HMAC request signing."
  value       = var.internal_api_secret
  sensitive   = true
}

# ─── JWT / Session Secrets ───────────────────────────────────────────────────

output "jwt_secret" {
  description = "JWT signing secret. Exposure allows forging of authentication tokens."
  value       = var.jwt_secret
  sensitive   = true
}

output "session_encryption_key" {
  description = "Symmetric key used for encrypting session data."
  value       = var.session_encryption_key
  sensitive   = true
}

# ─── Stellar / Blockchain Credentials ───────────────────────────────────────

output "stellar_private_key" {
  description = "Stellar account private key (secret seed). NEVER expose — controls fund movements."
  value       = var.stellar_private_key
  sensitive   = true
}

output "stellar_signing_key" {
  description = "Stellar transaction signing key for the relayer account."
  value       = var.stellar_signing_key
  sensitive   = true
}

# ─── Cloud Provider Credentials ─────────────────────────────────────────────

output "aws_secret_access_key" {
  description = "AWS secret access key for programmatic access. Treat as highly sensitive."
  value       = var.aws_secret_access_key
  sensitive   = true
}

# ─── Non-sensitive outputs (for reference) ───────────────────────────────────

output "db_host" {
  description = "Database hostname (non-sensitive)."
  value       = var.db_host
  sensitive   = false
}

output "db_port" {
  description = "Database port (non-sensitive)."
  value       = var.db_port
  sensitive   = false
}

output "api_endpoint" {
  description = "Public API endpoint URL (non-sensitive)."
  value       = var.api_endpoint
  sensitive   = false
}

# ─── Variable declarations ───────────────────────────────────────────────────
# These should be provided via terraform.tfvars or environment variables.
# NEVER hardcode secret values in .tf files or commit them to source control.

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "gasguard"
}

variable "db_host" {
  description = "Database hostname"
  type        = string
}

variable "db_port" {
  description = "Database port"
  type        = number
  default     = 5432
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "gasguard"
}

variable "api_key" {
  description = "GasGuard API key"
  type        = string
  sensitive   = true
}

variable "internal_api_secret" {
  description = "Internal API HMAC secret"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "session_encryption_key" {
  description = "Session data encryption key"
  type        = string
  sensitive   = true
}

variable "stellar_private_key" {
  description = "Stellar account private key (secret seed starting with 'S')"
  type        = string
  sensitive   = true
}

variable "stellar_signing_key" {
  description = "Stellar relayer signing key"
  type        = string
  sensitive   = true
}

variable "aws_secret_access_key" {
  description = "AWS secret access key"
  type        = string
  sensitive   = true
}

variable "api_endpoint" {
  description = "Public API endpoint URL"
  type        = string
  default     = "https://api.gasguard.io"
}
