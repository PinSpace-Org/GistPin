# Load Testing

Continuous load testing for GistPin using k6 or Locust.

## Test Scenarios

| Scenario | Tool | File |
|----------|------|------|
| API load test | k6 | `load-tests/api-load-test.js` |
| API load test | Locust | `load-tests/locustfile.py` |

### k6 Stages

| Stage | Duration | VUs |
|-------|----------|-----|
| Ramp up | 30s | 10 |
| Sustained | 1m | 50 |
| Peak | 30s | 100 |
| Ramp down | 30s | 0 |

### Performance Baselines

- p95 response time: < 500ms
- Error rate: < 1%

## Usage

```bash
# k6 (default)
BASE_URL=https://api.gistpin.io bash infrastructure/scripts/run-load-test.sh k6

# Locust
BASE_URL=https://api.gistpin.io bash infrastructure/scripts/run-load-test.sh locust
```

## Scheduled Runs

Load tests run automatically via the CI workflow on a nightly schedule and on every deployment to staging. See `infrastructure/ci/performance-benchmark.yml`.

## Regression Detection

Compare results against `infrastructure/ci/benchmark-baselines.json`. A p95 regression > 20% or error rate > 1% triggers a workflow failure.
