# Pod Network Latency Injection

Inject controlled network latency into specific pods to validate how the system
behaves under degraded network conditions — timeouts, retries, circuit breakers,
and SLO impact — without waiting for a real incident.

## How it works

Latency is applied with Linux traffic control (`tc netem`) on the pod's primary
interface:

```
tc qdisc add dev eth0 root netem delay 200ms 50ms distribution normal
```

- `delay 200ms` — base added latency.
- `50ms` — jitter (variation), normally distributed.

## Two ways to run it

| Method                                            | Use when… |
| ------------------------------------------------- | --------- |
| `inject-latency.sh` (kubectl exec)                | Ad-hoc, against a named pod, from an operator workstation. |
| `latency-injection.yaml` chaos Job                | Scheduled/automated experiment against label-selected pods. |

## Safety: automatic cleanup

The injection is **always** removed:

- `inject-latency.sh` sets a `trap` on `EXIT INT TERM`, so Ctrl-C, an error, or
  normal completion all restore the interface.
- The chaos `Job` sets `activeDeadlineSeconds`, so the experiment cannot outlive
  its window even if something hangs.

A latency test therefore never leaves a pod degraded after it finishes.

## Components

| File                                              | Purpose                                     |
| ------------------------------------------------- | ------------------------------------------- |
| `infrastructure/scripts/inject-latency.sh`        | Ad-hoc injection with baseline + cleanup.   |
| `infrastructure/k8s/chaos/latency-injection.yaml` | Time-boxed chaos Job (NET_ADMIN, RBAC).     |
| `infrastructure/docs/latency-testing.md`          | This document.                              |

## Running an ad-hoc test

```bash
./infrastructure/scripts/inject-latency.sh \
  --pod backend-abc123 --namespace backend \
  --latency 200ms --jitter 50ms --duration 120

# Force-remove if a previous run was killed uncleanly:
./infrastructure/scripts/inject-latency.sh --pod backend-abc123 --namespace backend --clean
```

## Measuring impact

The script records a baseline before injecting. During the hold window, observe
the effect through your existing signals:

- SLO dashboards (latency SLI, error rate).
- Downstream retry/timeout metrics.
- The `sli:*:latency_p95` recording rules.

The point of the experiment is to confirm the system degrades gracefully (retries
succeed, circuit breakers trip appropriately, SLOs stay within error budget)
rather than to measure the injected latency itself.

## Requirements

- The target container needs `tc` (iproute2) and the `NET_ADMIN` capability. The
  chaos Job runs an injector with `NET_ADMIN` for pods that don't carry `tc`
  themselves.
- Run against staging or an environment approved for chaos testing — never blind
  against production without a game-day plan.
