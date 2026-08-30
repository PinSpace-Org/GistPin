# Pod Resource Requests Auto-Tuning

Right-sizing pod `requests` and `limits` by hand drifts out of date as traffic
changes. The auto-tuner derives them from actual observed usage and rolls the
new values out safely.

## Method

For each workload, over a 7-day window of Prometheus data:

| Value              | Source                    | Rationale                                   |
| ------------------ | ------------------------- | ------------------------------------------- |
| `requests` (baseline) | **P95** of observed usage | Covers normal load without over-reserving.  |
| `limits` (ceiling)  | **P99** of observed usage | Absorbs spikes while still bounding the pod.|

Using P95 for requests keeps the scheduler's bin-packing tight (nodes aren't
padded for rare peaks), while P99 limits leave headroom for bursts before the
kernel throttles or OOM-kills.

## Components

| File                                              | Purpose                                        |
| ------------------------------------------------- | ---------------------------------------------- |
| `infrastructure/scripts/autotune-resources.sh`    | Computes P95/P99 recommendations, staged apply.|
| `infrastructure/k8s/autotune/tuner-cronjob.yaml`  | Weekly CronJob + RBAC to run the tuner.        |
| `infrastructure/docs/resource-autotuning.md`      | This document.                                 |

## Staged rollout

`--apply` does not slam new values onto every replica at once:

1. The new requests/limits are applied and the rollout is watched.
2. If the rollout does not become **Ready** within the timeout, it is
   automatically rolled back.
3. After it stabilizes, a **regression check** runs — if container restarts
   increased or the 5xx rate crossed the threshold in the observation window,
   the change is rolled back.

This means a bad recommendation (e.g. a limit set too low, causing OOM kills)
self-heals rather than degrading the service.

## Running

```bash
# Dry run — print recommendations only
./infrastructure/scripts/autotune-resources.sh --namespace backend

# Apply with staged rollout + regression guard
./infrastructure/scripts/autotune-resources.sh --apply --namespace backend
```

The CronJob runs the `--apply` path every Sunday at 03:00 (a low-traffic window
so any rollback is low-impact).

## Configuration

| Variable        | Default                  | Meaning                              |
| --------------- | ------------------------ | ------------------------------------ |
| `PROM_URL`      | `http://prometheus:9090` | Prometheus endpoint to query.        |
| `WINDOW`        | `7d`                     | Observation window.                  |
| `STAGE_PERCENT` | `25`                     | Canary fraction before full rollout. |

## Caveats

- The tuner needs enough history: a workload with less than the full window of
  data will be under-provisioned. New services should run with hand-set values
  until a week of data exists.
- Recommendations are only as good as the metrics — ensure `container_cpu_usage_seconds_total`
  and `container_memory_working_set_bytes` are being scraped for the workloads.
