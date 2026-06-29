
# Zero-Downtime Database Migration Strategy

This document describes the strategy for performing database schema migrations without downtime, using the Expand-Migrate-Contract pattern, dual-write phases, and proper rollback procedures.

## 1. Expand-Migrate-Contract Pattern

Zero-downtime migrations follow three phases:

### Phase 1: Expand

Add the new schema elements **alongside** existing ones. The application continues to use the old schema during this phase.

- Add new columns (nullable or with defaults).
- Create new indexes (concurrently where possible).
- Add new tables.

The application is updated to **dual-write** to both old and new columns, but still reads from the old schema. No existing data is modified.

### Phase 2: Migrate

Backfill and transition data to the new schema:

1. Backfill new columns with computed values.
2. Validate data consistency between old and new columns.
3. Deploy application update that reads from the new schema (while still dual-writing).
4. Monitor for errors and roll back if needed.

### Phase 3: Contract

Remove the old schema elements after the new schema is fully validated:

1. Remove dual-write logic from the application.
2. Drop old columns, indexes, or tables.
3. Run a final validation pass.

## 2. Dual-Write Phase

During dual-write every write operation writes to both the old and new schema:

```typescript
// Example: dual-write for a column rename
await entityManager.update(Table, id, {
  old_column: value,   // keep writing old
  new_column: value,   // write new too
});
```

Reads use a feature flag or environment variable to toggle between old and new schema. This allows instant rollback by flipping the toggle.

## 3. Safety Checks

The CI pipeline (`db-migration-safety.yml`) enforces:

| Check | Rule |
|---|---|
| Column drops | Blocked — must use Expand-Migrate-Contract |
| Column type changes | Blocked — must add new column instead |
| NOT NULL without DEFAULT | Blocked — breaks existing rows |
| Table drops | Blocked — must use soft-delete first |
| Renames | Blocked — breaks running application references |
| DEFAULT drops | Blocked — may cause insert failures |

## 4. Rollback Procedures

### Automated Rollback

If the migration safety check fails in CI, deployment is gated. If a migration fails at runtime:

1. Flip the read toggle back to the old schema.
2. Run `infrastructure/scripts/rollback-migrations.sh`.
3. Verify the application is healthy using old schema reads.
4. Investigate and fix the migration in a new PR.

### Manual Rollback

If automated rollback is unavailable:

1. Revert the application deploy to the previous version.
2. Run `npm run typeorm:rollback` from the previous release tag.
3. Verify database state with `check-migration-safety.sh --rollback`.

## 5. Best Practices

- **One logical change per migration** — smaller migrations are easier to review and roll back.
- **Always provide a down migration** — every `up` must be reversible.
- **Test migrations against a copy of production data** before deploying.
- **Run migrations outside of peak traffic hours**.
- **Monitor replication lag** during large backfill operations.
- **Keep migrations idempotent** — use `IF NOT EXISTS` / `IF EXISTS` clauses.
