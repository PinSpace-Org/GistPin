# Secret Rotation

Zero-downtime automated rotation of GistPin secrets.

## Script

```bash
./infrastructure/scripts/rotate-secrets.sh [db|api|cert|all]
```

## What Gets Rotated

| Target | Secret | Interval |
|--------|--------|----------|
| `db` | PostgreSQL password | 30 days |
| `api` | API keys | 90 days |
| `cert` | TLS certificates | 60 days |

## How It Works

1. Generates a new secret with `openssl rand`
2. Updates the secret in **AWS Secrets Manager**
3. Updates the live system (DB user / cert-manager annotation)
4. Triggers a **rolling restart** of affected pods (zero downtime)
5. Writes an audit entry to `/var/log/gistpin/secret-rotation.log`

## Schedule

Defined in `infrastructure/security/rotation-schedule.yml`. Run via cron or a Kubernetes CronJob.

## Audit Logs

All rotations are logged with timestamp, target, and outcome. Logs are retained for 90 days.
