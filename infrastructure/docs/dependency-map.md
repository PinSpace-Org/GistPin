# Infrastructure Dependency Map

This document lists every external dependency GistPin needs at runtime, how
each one is checked before a deploy, and what happens when a check fails.

The checks below are implemented in
[`infrastructure/scripts/check-dependencies.sh`](../scripts/check-dependencies.sh)
and run as a gate in
[`infrastructure/ci/pre-deploy-checks.yml`](./pre-deploy-checks.yml) before
`deploy-dev.yml`, `deploy-staging.yml`, and `deploy-production.yml`.

## Dependencies

| Dependency | Used for | Critical | Check | Env vars |
|---|---|---|---|---|
| Postgres/PostGIS | Primary data store for gists, geospatial queries | Yes | TCP reachability (`pg_isready`, falls back to `/dev/tcp`) plus a real `SELECT 1` query | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD` |
| Soroban RPC (Stellar) | Reading/submitting gist registry contract transactions | Yes | JSON-RPC `getHealth` call, expects `"status":"healthy"` | `SOROBAN_RPC_URL` |
| IPFS gateway (Pinata) | Serving pinned gist content | No | HTTP reachability check against the gateway root | `IPFS_GATEWAY` |
| Pinata pinning API | Pinning new gist content to IPFS | No | `testAuthentication` call with the configured API key/secret. Skipped entirely when keys are blank, since dev falls back to mock CIDs | `PINATA_API_KEY`, `PINATA_SECRET_KEY` |

"Critical" dependencies block a deploy on failure. Non-critical dependencies
are still checked and reported, but a failure there degrades functionality
(e.g. new content can't be pinned) rather than making the app fully
unavailable, so they don't block by themselves.

## Blocking behavior

`check-dependencies.sh` exits non-zero if any **critical** dependency is
unhealthy, and the `pre-deploy-checks.yml` job fails, which blocks the
downstream deploy job via `needs:`. Non-critical failures are recorded in
the report but do not change the exit code.

Every run writes a timestamped JSON report to
`infrastructure/ci/reports/dependency-health-<timestamp>.json` and uploads
it as a workflow artifact so failures can be diagnosed after the fact
without re-running the pipeline.

## Emergency bypass

Sometimes a deploy needs to go out despite a check that's failing for a
known, already-mitigated reason (e.g. a flaky health probe during a
provider incident that's been confirmed manually). The bypass:

- Requires **both** `emergency_bypass: true` and a non-empty
  `emergency_reason` -- the workflow refuses to run without a reason.
- Still runs every check and writes the report, so the unhealthy state is
  on record even though it didn't block.
- Logs a `WARN` line with the reason so it shows up clearly in the job log
  and in the report's `emergency_reason` field.

Bypass is meant for genuine incidents, not for routinely skipping the gate.
If a check is flaky or wrong, fix the check -- don't reach for the bypass.

## Adding a new dependency

1. Add a `check_<name>()` function to `check-dependencies.sh` following the
   existing pattern (log start, run the check, call `record` with
   `name|status|critical|detail`).
2. Call it from `main()`.
3. Add a row to the table above.
4. If the CI job needs a new secret or variable to reach it, add it to
   `pre-deploy-checks.yml`'s `env:` block for the `Run dependency health
   checks` step.
