# Docker Multi-Stage Build Pipeline

## Overview

The `docker-build-pipeline.yml` workflow implements a four-stage CI/CD pipeline for building, testing, scanning, and publishing the GistPin backend Docker image.

## Pipeline Stages

```
build ──┬── test          ──┐
        └── security-scan ──┴── push (main only)
```

| Stage | Trigger | Description |
|-------|---------|-------------|
| **build** | Every PR and push | Compiles the app using the `build` Dockerfile target. Populates the GitHub Actions layer cache. |
| **test** | After build | Runs unit tests inside the `test` Dockerfile target. Fails the pipeline on any test failure. |
| **security-scan** | After build (parallel with test) | Builds the `production` target and scans it with Trivy. Fails on CRITICAL or HIGH CVEs. |
| **push** | `main` branch pushes only, after test + scan pass | Logs in to GHCR, builds the final production image, and pushes with SHA and branch tags. |

## Image Tags

Images pushed to `ghcr.io/<owner>/gistpin`:

| Tag | Example | When |
|-----|---------|------|
| `sha-<commit>` | `sha-a1b2c3d` | Every push to main |
| `<branch>` | `main` | Every push to main |
| `latest` | `latest` | Pushes to `main` only |

## Dockerfile Targets

The pipeline expects a multi-stage `Dockerfile` in `Backend/` with the following named targets:

```dockerfile
FROM node:20-alpine AS build
# Install deps and compile TypeScript

FROM build AS test
# Run jest tests

FROM node:20-alpine AS production
# Copy compiled output only — no dev dependencies
```

## Security Scanning

[Trivy](https://github.com/aquasecurity/trivy) scans the production image for OS and library vulnerabilities. The pipeline fails on any **CRITICAL** or **HIGH** severity finding. To suppress a known false positive, add it to `.trivyignore` at the repo root.

## Local Usage

```bash
# Build the production image locally
docker build --target production -t gistpin-backend:local ./Backend

# Run the push script manually (dry-run)
IMAGE=ghcr.io/org/gistpin TAG=sha-abc123 BRANCH=main \
  bash infrastructure/ci/scripts/docker-push.sh
```
