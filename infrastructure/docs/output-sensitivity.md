# Terraform Sensitive Output Masking

> **Issue:** [#1133](https://github.com/PinSpace-Org/GistPin/issues/1133)

This document describes the sensitive output masking policy for all Terraform configurations in GasGuard. All outputs containing credentials, secrets, or private keys must be explicitly marked with `sensitive = true`.

---

## Why Sensitive Outputs Matter

Terraform outputs are visible in several places that could expose secrets:

- **`terraform plan` / `terraform apply` output** — printed to terminal and CI/CD logs
- **`terraform show`** — displays full state contents
- **Remote state backends** — may store values in plaintext if not encrypted
- **CI/CD log retention** — pipeline logs are often retained for weeks or months

Marking outputs as `sensitive = true` causes Terraform to replace their values with `(sensitive value)` in all text output, reducing the risk of accidental exposure.

---

## Sensitive Outputs Reference

The following outputs are defined in `infrastructure/terraform/sensitive-outputs.tf` and are all marked `sensitive = true`:

| Output Name | Type | Description | Risk if Exposed |
|-------------|------|-------------|----------------|
| `db_password` | string | Database master password | Full database access |
| `db_connection_string` | string | Complete DB URL with credentials | Full database access |
| `api_key` | string | GasGuard API key | API abuse, data access |
| `internal_api_secret` | string | HMAC signing secret | Request forgery |
| `jwt_secret` | string | JWT signing secret | Authentication bypass |
| `session_encryption_key` | string | Session data encryption key | Session hijacking |
| `stellar_private_key` | string | Stellar account secret seed | Fund theft |
| `stellar_signing_key` | string | Stellar relayer signing key | Unauthorized transactions |
| `aws_secret_access_key` | string | AWS programmatic access key | Full cloud account access |

---

## Non-Sensitive Outputs

The following outputs are **not** marked sensitive and may appear in logs:

| Output Name | Type | Description |
|-------------|------|-------------|
| `db_host` | string | Database hostname |
| `db_port` | number | Database port |
| `api_endpoint` | string | Public API endpoint URL |
| `waf_rate_acl_arn` | string | WAF ACL ARN (from waf-rate-rules.tf) |
| `waf_geo_acl_arn` | string | WAF Geo ACL ARN (from waf-geo-rules.tf) |

---

## Guidelines for Adding New Outputs

### Rule: Always mark as sensitive if the output:
- Contains a password, secret, key, token, or seed
- Could be used for authentication or authorization
- Controls financial assets (especially blockchain keys)
- Is used by another service to sign or encrypt data

### How to declare a sensitive output

```hcl
output "my_secret" {
  description = "Explain what this is and why it's sensitive."
  value       = var.my_secret
  sensitive   = true  # ← REQUIRED for all credentials
}
```

### How to declare a sensitive variable

```hcl
variable "my_secret" {
  description = "The secret value"
  type        = string
  sensitive   = true  # ← Prevents value from appearing in plan output
}
```

---

## Secret Scanning in CI/CD

All Terraform plan outputs are automatically scanned for secret patterns in CI/CD pipelines using the workflow defined in `infrastructure/ci/secret-scan-plans.yml`.

### Patterns Scanned

| Pattern | Example Match |
|---------|--------------|
| AWS Secret Key | `AKIA...` or `aws_secret_access_key = "..."` |
| Private Key Block | `-----BEGIN PRIVATE KEY-----` |
| Stellar Secret Seed | `S` + 55 base32 characters |
| JWT Secret plaintext | `jwt_secret = "some-value"` |
| Database password | `db_password = "hunter2"` |
| API Key plaintext | `api_key = "sk-..."` |
| Generic password | `password = "..."` |
| Generic secret | `secret = "..."` |

### What happens when a secret is detected

1. The GitHub Actions step `Scan plan output for secret patterns` fails.
2. An `::error::` annotation is posted to the PR/commit.
3. A summary is posted to the workflow run showing which pattern matched.
4. The pipeline exits with code `1`, blocking the PR merge.

---

## Security Best Practices

1. **Never hardcode secrets in `.tf` files.** Always use variables.
2. **Use a secrets manager** (AWS Secrets Manager, HashiCorp Vault) as the source of truth.
3. **Encrypt remote state.** Enable server-side encryption for S3 state backends.
4. **Rotate secrets regularly.** Use Terraform's `lifecycle` or external rotation tooling.
5. **Limit `terraform output` access** in CI/CD by restricting who can view job logs.
6. **Add `.tfvars` files to `.gitignore`** to prevent accidental secret commits.

```gitignore
# .gitignore
*.tfvars
*.tfvars.json
*.tfstate
*.tfstate.backup
.terraform/
```

---

## References

- [Terraform: Sensitive Values](https://developer.hashicorp.com/terraform/language/values/outputs#sensitive-suppressing-values-in-cli-output)
- [Terraform: Sensitive Variables](https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output)
- [Secret Scan Workflow](../ci/secret-scan-plans.yml)
- [Sensitive Outputs Definition](../terraform/sensitive-outputs.tf)
