# Sensitive Variable Management

All variables containing credentials, keys, or other secrets are marked with
`sensitive = true` in Terraform. This ensures they are **never printed** in plan
or apply output and are not stored in state in plaintext.

## Sensitive variables

| Variable | Description | Minimum length |
|---|---|---|
| `db_password` | RDS master password | 16 characters |
| `db_username` | RDS master username | 3 characters, alphanumeric |
| `jwt_secret` | JWT signing key | 32 characters |
| `api_key` | External API credential | — |
| `smtp_password` | SMTP server password | — |

## AWS Secrets Manager

Runtime secret values are stored in AWS Secrets Manager and referenced via
`data "aws_secretsmanager_secret_version"` blocks. Terraform only stores the
**ARN** in state, never the secret value.

Secret naming convention:

```
{project_name}-{environment}-{purpose}
# e.g. gistpin-prod-db-credentials
```

## Passing secrets safely

Use environment variables or a secrets backend — never commit `.tfvars` files
containing real values.

```bash
export TF_VAR_db_password="$(aws secretsmanager get-secret-value \
  --secret-id gistpin-prod-db-credentials \
  --query SecretString --output text | jq -r .password)"
```

## Audit

Run `grep -r 'sensitive' infrastructure/terraform/` to list all variables
currently marked sensitive. CI blocks any PR that removes a `sensitive = true`
annotation from an existing variable.
