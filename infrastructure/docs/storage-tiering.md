# Storage Tiering Automation

This repository now has a small storage-tiering workflow for long-lived S3 data:

- Terraform lifecycle rules for the backup bucket
- An access-analysis script that scores objects by recency and request volume
- Retrieval commands for archived objects
- A JSON report that can be used for cost review

## Terraform

The backup bucket is configured to transition through cheaper tiers over time:

- `STANDARD_IA` after 30 days
- `GLACIER_IR` after 90 days
- `DEEP_ARCHIVE` after 180 days
- noncurrent versions are expired after 365 days

See [`infrastructure/terraform/s3-tiering.tf`](../terraform/s3-tiering.tf) and the existing bucket definitions in [`infrastructure/terraform/s3-buckets.tf`](../terraform/s3-buckets.tf).

## Access Analysis

Use [`infrastructure/scripts/analyze-access.sh`](../scripts/analyze-access.sh) to turn an access inventory into a recommendation report.

The script expects JSON like:

```json
[
  {
    "key": "backups/2026-06-01.sql.gz",
    "bucket": "gistpin-backups",
    "storage_class": "STANDARD",
    "size_bytes": 12345,
    "last_accessed_days": 42,
    "request_count_30d": 8
  }
]
```

Run it with a file or by piping JSON on stdin:

```bash
bash infrastructure/scripts/analyze-access.sh \
  --input /tmp/s3-access-inventory.json \
  --bucket gistpin-backups
```

The script writes a report to `infrastructure/ci/reports/storage-tiering/` by default. The report includes:

- object counts per tier
- normalized storage-cost estimates
- objects that should move to a cheaper class
- restore commands for archived objects
- a lifecycle recommendation block for the backup bucket

## Retrieval

For objects recommended for archive storage, the report includes restore commands using `aws s3api restore-object`.

Example:

```bash
aws s3api restore-object \
  --bucket gistpin-backups \
  --key backups/2026-06-01.sql.gz \
  --restore-request '{"Days":7,"GlacierJobParameters":{"Tier":"Standard"}}'
```

## Cost Review

Treat the generated report as an operational cost review artifact:

1. Run the access analysis on the latest inventory export.
2. Review objects recommended for tier changes.
3. Apply the lifecycle rules or restore commands as needed.
4. Re-run the report to confirm the savings trend.
