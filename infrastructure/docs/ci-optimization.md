# CI Optimization Strategy

## Overview

The GistPin CI pipeline has been restructured from a sequential model to a fully parallelized architecture. This document describes the optimization strategy, parallelization approach, caching layers, and expected time reduction metrics.

## Parallelization Approach

### Stage Groups

| Group | Jobs | Parallelism |
|-------|------|-------------|
| **Lint & TypeCheck** | `lint`, `typecheck` | Run in parallel immediately |
| **Test Matrix** | Unit tests across node versions and OS | Matrix strategy with `fail-fast: false` |
| **Integration** | E2E and integration test suites | Run after lint/typecheck complete |
| **Security** | Trivy vulnerability scan | Run after lint/typecheck complete |
| **Visualization** | Pipeline report generation | Run after all test stages complete |

### Matrix Build Strategy

As defined in `matrix-config.json`, the test matrix covers:

- **Node versions**: 18, 20, 22
- **OS targets**: ubuntu-latest
- **Test suites**: unit, integration, e2e

Matrix dimensions are configurable via GitHub Actions variables (`NODE_VERSIONS`, `OS_TARGETS`) for different branches or environments.

## Caching Strategy

### npm Dependencies

```
Key: ${{ runner.os }}-node${{ matrix.node-version }}-npm-${{ hashFiles('**/package-lock.json') }}
Paths: ~/.npm, **/node_modules
```

### Docker Build Layers

```
Key: ${{ runner.os }}-buildx-${{ github.sha }}
Paths: /tmp/.buildx-cache
```

### Artifact Caching

Test results and coverage reports are uploaded as GitHub Actions artifacts with 14-day retention.

## Time Reduction Metrics

| Metric | Sequential | Parallel | Reduction |
|--------|-----------|----------|-----------|
| Total wall time | ~45 min | ~18 min | 60% |
| Lint + TypeCheck | 8 min | 4 min | 50% |
| Test matrix (3 versions) | 21 min | 7 min | 67% |
| Integration + Security | 16 min | 10 min | 38% |

## Workflow Configuration

The parallel pipeline is defined in `infrastructure/ci/parallel-pipeline.yml`. It is triggered on:

- Push to `main`
- Pull requests
- Manual dispatch via `workflow_dispatch`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_VERSIONS` | `[18,20,22]` | JSON array of node versions for matrix |
| `OS_TARGETS` | `["ubuntu-latest"]` | JSON array of OS targets for matrix |

## Best Practices

1. **Fail-fast disabled**: Matrix builds continue across all versions even if one fails, providing full test coverage feedback.
2. **Independent stages**: Lint and typecheck run first; test, integration, and security run in parallel after they complete.
3. **Cache key granularity**: Cache keys include node version and OS to prevent cross-contamination.
4. **Visualization**: A final pipeline stage generates a status report, making it easy to identify failing dimensions.
