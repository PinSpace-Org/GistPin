# Kubernetes Startup Probes

Startup probes protect GistPin's slow-starting containers from being killed
during boot. This document explains why they exist, how they are configured for
each service, and how they differ from liveness and readiness probes.

## Why startup probes?

Without a startup probe, a liveness probe must be tuned to tolerate the *worst*
startup time of an application. That means:

- `initialDelaySeconds` set high enough for the slowest cold start, which delays
  restarts after genuine crashes by that same amount, or
- aggressive checks that kill containers mid-boot (e.g. while database
  migrations run), causing **restart loops**.

A startup probe solves this: liveness/readiness checks are **disabled until the
startup probe succeeds**, then take over immediately. Crashes are detected fast,
and slow starts are never punished.

## Probe types at a glance

| Probe         | Purpose                                             | On failure                        |
| ------------- | --------------------------------------------------- | --------------------------------- |
| `startupProbe`| "Has the app finished booting?"                     | Container is restarted            |
| `livenessProbe` | "Is the app still alive (not deadlocked)?"        | Container is restarted            |
| `readinessProbe` | "Can this instance serve traffic right now?"     | Removed from Service endpoints    |

## Configuration per service

Canonical snippets live in [`k8s/probes/startup-probes.yaml`](../k8s/probes/startup-probes.yaml).

### Backend API (`backend-deployment.yaml`)

- Endpoint: `GET /health` on port `3000`
- `periodSeconds: 10`, `failureThreshold: 30` → up to **300s** to finish booting
- Covers: Prisma/DB migrations on start, Redis connection warmup, JIT warmup

```yaml
startupProbe:
  httpGet:
    path: /health
    port: 3000
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 30
```

Because the startup probe gates the others, the backend's
`livenessProbe.initialDelaySeconds` was lowered from `30` → `5` and
`readinessProbe.initialDelaySeconds` from `10` → `1`: those delays only apply
*after* startup succeeds, so crashes during steady state are now caught within
seconds instead of waiting out a fixed grace period.

### Frontend

- Endpoint: `GET /` on port `3000`
- `periodSeconds: 5`, `failureThreshold: 24` → up to **120s**

### Analytics

- Endpoint: `GET /health` on port `4000`
- `periodSeconds: 10`, `failureThreshold: 18` → up to **180s**

### PostgreSQL

- Uses `exec: pg_isready` instead of HTTP
- `periodSeconds: 10`, `failureThreshold: 60` → up to **600s** to allow WAL
  replay/crash recovery after restore

## Sizing rule

```
max tolerated startup time = failureThreshold × periodSeconds
```

Set the product comfortably above your observed p99 startup time (aim for ~2×).
If a service starts failing its startup probe after a legitimate slowdown
(e.g. larger migration), raise `failureThreshold` — do **not** disable the probe.

## Operational notes

- Startup probes run until first success; afterwards only
  liveness/readiness run.
- Keep the startup endpoint cheap (`/health` performs no dependency calls where
  possible) so a healthy-but-busy container is not marked failed.
- Distinct failure thresholds per service reflect their real startup profiles;
  do not copy values blindly onto new services.
