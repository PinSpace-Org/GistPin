# Terraform Resource Lifecycle Hooks

## Configured Lifecycle Provisions
- **Pre-Destroy Backup**: Automatically creates a DB snapshot before resource destruction using `pre-destroy-backup.sh`.
- **Post-Create Validation**: Verifies health and notifies webhooks upon completion.
- **Hook Failure Handling**: Pre-destroy errors block destruction (`on_failure = fail`); non-critical validation allows continuation with alerts (`on_failure = continue`).
