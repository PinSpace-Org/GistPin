################################################################################
# AWS Macie custom data identifiers – GistPin-specific sensitive data
#
# Managed Macie detectors already cover PII (emails, phone numbers, cards...).
# These identifiers add detection for data that is specific to GistPin and to
# blockchain platforms in general:
#
#   * Stellar wallet secret keys  (S...)        -> critical, credential material
#   * Stellar wallet public keys  (G...)        -> medium, identifier linkage
#   * Generic API keys/tokens assigned to services
#   * USDC transaction memos containing account identifiers
################################################################################

# ---------------------------------------------------------------------------
# Stellar secret key (S + 55 base32 chars) – highest priority: this is live
# credential material that can move funds.
# ---------------------------------------------------------------------------

resource "aws_macie2_custom_data_identifier" "stellar_secret_key" {
  depends_on = [aws_macie2_account.main]

  name                 = "gistpin-stellar-secret-key"
  description          = "Stellar network secret key (S...) - treat as exposed credentials"
  keywords             = ["secret", "seed", "private", "key", "signer", "signing"]
  maximum_match_distance = 30
  ignore_words_threshold = 90

  regex = "S[A-Z2-7]{55}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "macie-custom-identifier"
  }
}

# ---------------------------------------------------------------------------
# Stellar public key / account ID (G + 55 base32 chars)
# ---------------------------------------------------------------------------

resource "aws_macie2_custom_data_identifier" "stellar_public_key" {
  depends_on = [aws_macie2_account.main]

  name        = "gistpin-stellar-public-key"
  description = "Stellar network public key / account ID (G...)"
  keywords    = ["wallet", "account", "public", "address", "destination"]
  maximum_match_distance = 30

  regex = "G[A-Z2-7]{55}"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "macie-custom-identifier"
  }
}

# ---------------------------------------------------------------------------
# Service API keys (e.g. sk_live_..., gpin_..., Bearer tokens)
# ---------------------------------------------------------------------------

resource "aws_macie2_custom_data_identifier" "api_key" {
  depends_on = [aws_macie2_account.main]

  name        = "gistpin-service-api-key"
  description = "Provider API keys and bearer tokens committed to S3 payloads/logs"
  keywords    = ["api", "token", "authorization", "bearer", "apikey"]
  maximum_match_distance = 20

  regex = "(sk_(live|test)_[0-9a-zA-Z]{16,}|gpin_[0-9a-zA-Z]{24,}|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "macie-custom-identifier"
  }
}

# ---------------------------------------------------------------------------
# Database connection strings with embedded credentials
# ---------------------------------------------------------------------------

resource "aws_macie2_custom_data_identifier" "db_connection_string" {
  depends_on = [aws_macie2_account.main]

  name        = "gistpin-db-connection-string"
  description = "Connection strings embedding usernames/passwords (postgres://user:pass@host)"
  keywords    = ["postgres", "postgresql", "database_url", "connection"]
  maximum_match_distance = 20

  regex = "(postgres(ql)?://[A-Za-z0-9_]+:[^@/\\s]{8,}@[A-Za-z0-9_.-]+[:0-9]*/?[A-Za-z0-9_]*)"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "macie-custom-identifier"
  }
}

# ---------------------------------------------------------------------------
# Attach every custom identifier to the daily classification job so scheduled
# scans evaluate them alongside managed identifiers.
# ---------------------------------------------------------------------------

resource "aws_macie2_classification_job" "custom_identifier_scan" {
  depends_on = [
    aws_macie2_account.main,
    aws_macie2_custom_data_identifier.stellar_secret_key,
    aws_macie2_custom_data_identifier.stellar_public_key,
    aws_macie2_custom_data_identifier.api_key,
    aws_macie2_custom_data_identifier.db_connection_string,
  ]

  name     = "${var.project_name}-${var.environment}-daily-custom-identifier-scan"
  job_type = "SCHEDULED"

  schedule_frequency {
    daily_schedule = 1
  }

  custom_data_identifier_ids = [
    aws_macie2_custom_data_identifier.stellar_secret_key.id,
    aws_macie2_custom_data_identifier.stellar_public_key.id,
    aws_macie2_custom_data_identifier.api_key.id,
    aws_macie2_custom_data_identifier.db_connection_string.id,
  ]

  bucket_criteria {
    includes {
      and {
        simple_criterion {
          comparator = "EQ"
          key        = "BUCKET_NAME"
          values = [
            "${var.project_name}-${var.environment}-uploads",
            "${var.project_name}-${var.environment}-backups",
            "${var.project_name}-${var.environment}-logs",
          ]
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "sensitive-data-discovery"
  }
}
