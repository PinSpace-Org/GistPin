# K8s Rolling Update Health Validation

> **Issue:** [#1132](https://github.com/PinSpace-Org/GistPin/issues/1132)

This document explains the rollout health validation system for Kubernetes deployments in GasGuard. The system automatically validates rolling updates and triggers rollback if health thresholds are exceeded.

---

## Overview

The validation pipeline runs after every Kubernetes deployment to ensure:
1. The rollout completes within the defined timeout.
2. All desired replicas reach the `Ready` state.
3. Pod error rates remain below acceptable thresholds.
4. Automatic rollback is triggered if validation fails.

---

## Validation Steps

### Step 1: Deployment Existence Check

The script verifies the target deployment exists in the specified namespace before proceeding:

```bash
kubectl get deployment <DEPLOYMENT> -n <NAMESPACE>
```

If the deployment is not found, the script exits immediately with an error.

---

### Step 2: Rollout Completion Wait

```bash
kubectl rollout status deployment/<DEPLOYMENT> -n <NAMESPACE> --timeout=300s
```

- **Timeout:** 300 seconds (configurable via `ROLLOUT_TIMEOUT` env var).
- If the rollout does not complete within the timeout, rollback is triggered automatically.
- Exit code from `kubectl rollout status` is checked; non-zero triggers rollback.

---

### Step 3: Pod Readiness Check

```bash
kubectl get deployment <DEPLOYMENT> -n <NAMESPACE> \
  -o jsonpath='{.status.readyReplicas}'
```

Compares `readyReplicas` vs `spec.replicas`. A warning is logged if not all replicas are ready, but the script continues to the error rate check (partial readiness may be acceptable during canary deployments).

---

### Step 4: Error Rate Check via Pod Logs

```bash
kubectl logs <POD> -n <NAMESPACE> --tail=200 --all-containers=true \
  | grep -ciE "(error|exception|fatal|panic|SIGTERM|OOMKilled)"
```

- **Log lines inspected:** Last 200 lines per pod (configurable via `LOG_LINES` env var).
- **Error patterns matched:** `error`, `exception`, `fatal`, `panic`, `SIGTERM`, `OOMKilled`
- **Threshold:** Default 5 errors total across all pods (configurable via `ERROR_THRESHOLD` arg).
- Errors from all running pods are summed before comparing to threshold.

---

## Rollback Conditions

Automatic rollback (`kubectl rollout undo`) is triggered when **any** of the following occur:

| Condition | Details |
|-----------|---------|
| Rollout timeout | Rollout did not complete within `ROLLOUT_TIMEOUT` (default: 300s) |
| Error threshold exceeded | Total errors across pods > `ERROR_THRESHOLD` (default: 5) |
| `kubectl rollout status` failure | Non-zero exit code from rollout status check |

### Rollback Command

```bash
kubectl rollout undo deployment/<DEPLOYMENT> -n <NAMESPACE>
```

After triggering rollback, the script waits for the rollback to complete and logs the result. If rollback also fails, a critical error is logged and the pipeline exits with code `2`.

---

## Usage

### CLI

```bash
chmod +x infrastructure/scripts/validate-rollout.sh

# Basic usage
./infrastructure/scripts/validate-rollout.sh my-deployment production

# With custom error threshold
./infrastructure/scripts/validate-rollout.sh my-deployment production 10

# With custom timeout
ROLLOUT_TIMEOUT=600s ./infrastructure/scripts/validate-rollout.sh my-deployment staging
```

### GitHub Actions

Call the validation workflow after deployment:

```yaml
jobs:
  deploy:
    uses: ./.github/workflows/deploy.yml

  validate:
    needs: deploy
    uses: ./.github/workflows/rollout-validation.yml
    with:
      deployment: my-deployment
      namespace: production
      error_threshold: "5"
    secrets:
      KUBE_CONFIG: ${{ secrets.KUBE_CONFIG }}
```

Or trigger manually:

```
Actions → K8s Rollout Validation → Run workflow
```

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOYMENT` (arg 1) | *required* | Kubernetes deployment name |
| `NAMESPACE` (arg 2) | `default` | Kubernetes namespace |
| `ERROR_THRESHOLD` (arg 3) | `5` | Max error logs before rollback |
| `ROLLOUT_TIMEOUT` (env) | `300s` | kubectl rollout status timeout |
| `LOG_LINES` (env) | `200` | Lines of logs to scan per pod |

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Validation passed — deployment is healthy |
| `1` | Validation setup error (missing args, kubectl not found, deployment not found) |
| `2` | Rollback triggered — deployment failed health check |

---

## Integration with CI/CD

The rollout validation is defined in `infrastructure/ci/rollout-validation.yml` as a reusable GitHub Actions workflow. It can be called from any deployment pipeline using `workflow_call`.

See [rollout-validation.yml](../ci/rollout-validation.yml) for the full workflow definition.
