# CI Setup — Backend Testing

## Overview

The `github-actions-backend.yml` workflow runs automated tests for the NestJS backend on every pull request and push to `main` that touches the `Backend/` directory.

## Workflow Steps

| Step | Description |
|------|-------------|
| Checkout | Clones the repository |
| Node.js setup | Installs Node 20 with npm cache keyed to `Backend/package-lock.json` |
| Install deps | `npm ci` for reproducible installs |
| Unit tests + coverage | `npm run test:cov` — fails the pipeline if any test fails |
| Upload coverage | Saves the `coverage/` directory as a GitHub Actions artifact (14-day retention) |
| E2E tests | `npm run test:e2e` against the NestJS app |

## Coverage Thresholds

Defined in `test-config.json`. The pipeline fails if global coverage drops below:

- **Lines / Statements / Functions**: 80%
- **Branches**: 70%

## Running Locally

```bash
cd Backend
npm ci
npm run test:cov   # unit tests + coverage
npm run test:e2e   # end-to-end tests
```

## Required Secrets

No secrets are required for the test workflow. If tests need a database, add a `services` block to the workflow and set the following repository secrets:

| Secret | Purpose |
|--------|---------|
| `DB_HOST` | Postgres host (defaults to `localhost` in CI) |
| `DB_PORT` | Postgres port (defaults to `5432`) |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `DB_NAME` | Database name |
