# HPA Downscale Protection

Critical services must not be shrunk prematurely while they are recovering from
a traffic spike. If the HPA scales down too eagerly the moment CPU dips, the
next wave of traffic hits an under-provisioned service and triggers another
overload — a thrash cycle. Downscale protection makes scale-**down** slow and
deliberate while keeping scale-**up** fast.

## Mechanism

The v2 `autoscaling` API's `behavior` block controls scale velocity
independently for up and down:

| Direction  | Policy                                                              |
| ---------- | ------------------------------------------------------------------ |
| Scale up   | No stabilization delay; allow +100% or +4 pods per 30s (`Max`).    |
| Scale down | 10-minute stabilization window; remove at most 10% of pods per 5m (`Min`). |

The `stabilizationWindowSeconds: 600` on scale-down means the HPA must observe
sustained low utilization for 10 minutes before it removes any pods — absorbing
the brief dips that follow a spike.

## Components

| File                                                    | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `infrastructure/k8s/hpa/downscale-protection.yaml`      | The protected HPA (fast up, slow down).        |
| `infrastructure/k8s/hpa/stabilization-config.yaml`      | Reusable profiles + business-hours floor + override. |
| `infrastructure/docs/downscale-protection.md`           | This document.                                 |

## Protection profiles

`stabilization-config.yaml` defines reusable scale-down profiles so behaviour is
consistent across services:

| Profile   | Stabilization | Max downscale      | Use for                     |
| --------- | ------------- | ------------------ | --------------------------- |
| critical  | 10 min        | 10% / 5 min        | User-facing critical paths. |
| standard  | 5 min         | 25% / 2 min        | Normal services.            |
| batch     | 1 min         | 50% / 1 min        | Idle-shrinkable batch work. |

## Business-hours protection

During peak hours (08:00–20:00 UTC, weekdays) critical services are pinned to
the `critical` profile and their replica **floor** is raised (via a CronJob that
patches `minReplicas`). A midday lull therefore can't shrink capacity that the
afternoon peak will immediately need back. A companion schedule restores the
normal floor after peak.

## Override mechanism

A workload can pin its own protection regardless of the schedule using
Deployment annotations:

```yaml
metadata:
  annotations:
    gistpin.io/hpa-profile: "critical"
    gistpin.io/hpa-min-floor: "6"
```

This is the escape hatch for a service with an atypical traffic shape (e.g. a
service whose spikes don't follow business hours).

## Traffic pattern awareness

The combination — fast up, slow down, raised business-hours floor — encodes the
assumption that traffic *rises* faster than it should be *given back*. For a
service whose load is genuinely spiky and short-lived, use the `standard` or
`batch` profile so you don't pay for idle capacity.
