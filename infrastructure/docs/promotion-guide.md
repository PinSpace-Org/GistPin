# Environment Promotion Guide

Artifacts flow through three environments before reaching production: **dev → staging → production**.

## Promotion Flow

```
dev  ──► staging ──► production
```

Each promotion:
1. Verifies the artifact is healthy in the source environment.
2. Retags the container image in ECR.
3. Updates the Kubernetes deployment in the target environment.
4. Writes an audit log entry to S3.

Production promotions additionally require manual approval via a GitHub Environment.

## Triggering a Promotion

### Via GitHub Actions UI

1. Go to **Actions → Environment Promotion Pipeline**.
2. Click **Run workflow**.
3. Fill in `artifact_version`, `from_env`, and `to_env`.
4. For production promotions, a team lead must approve the pending job.

### Via CLI (for staging)

```bash
gh workflow run promotion-pipeline.yml \
  -f artifact_version=1.4.2 \
  -f from_env=dev \
  -f to_env=staging
```

## Environment Gates

| Gate | dev → staging | staging → production |
|------|---------------|----------------------|
| Artifact exists in source | ✅ automated | ✅ automated |
| Manual approval | ❌ not required | ✅ required |
| Rollback on failure | ✅ automated | ✅ automated |

## Rollback

Rollback is triggered automatically on promotion failure. To manually rollback:

```bash
bash infrastructure/scripts/promote-artifact.sh --rollback --env staging
```

Or via GitHub Actions:

```bash
gh workflow run promotion-pipeline.yml \
  -f artifact_version=previous \
  -f from_env=staging \
  -f to_env=staging
```

## Audit Log

All promotions are logged to `s3://gistpin-audit-logs/promotions/YYYY/MM/DD/`.

Each entry is a JSON object:

```json
{
  "time": "2026-06-23T08:00:00Z",
  "version": "1.4.2",
  "from": "staging",
  "to": "production",
  "actor": "northersubair",
  "status": "success"
}
```
