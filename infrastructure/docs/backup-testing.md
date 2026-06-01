# Backup Testing

Automated backup verification for GistPin's PostgreSQL database.

## Scripts

| Script | Purpose |
|--------|---------|
| `infrastructure/scripts/test-backup.sh` | Full backup test: restore → validate → perf check → cleanup |
| `infrastructure/scripts/restore-backup.sh` | Restore a specific backup to a target database |

## Usage

```bash
# Test the latest backup
./infrastructure/scripts/test-backup.sh

# Test a specific backup
./infrastructure/scripts/test-backup.sh 20260601-020000

# Restore to a named DB
./infrastructure/scripts/restore-backup.sh latest gistpin_restore_test
```

## What Gets Tested

1. **Restore** — backup file is restored to an isolated test database
2. **Data integrity** — record count validated (fails if 0 rows)
3. **Query performance** — basic latency check on the `gists` table
4. **Cleanup** — test database dropped after verification

## Scheduling

Add to cron or CI to run after each backup job:

```yaml
# infrastructure/ci/backup-verification.yml already triggers this
```

## Failure Handling

If the test fails, the script exits non-zero and logs to `/tmp/backup-test-*.log`. CI will block deployment until resolved.
