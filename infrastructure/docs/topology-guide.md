
# Pod Topology Spread Strategy

This document describes the topology spread constraints applied to GistPin workloads, guiding how pods are distributed across failure domains to maximise availability.

## 1. Overview

Topology spread constraints control how pods are scheduled across topology domains such as zones (`topology.kubernetes.io/zone`) and hosts (`kubernetes.io/hostname`). By spreading pods evenly we reduce the blast radius of a single-zone or single-node failure.

## 2. Backend — Strict Zone Spread

| Field | Value |
|---|---|
| `maxSkew` | 1 |
| `topologyKey` | `topology.kubernetes.io/zone` |
| `whenUnsatisfiable` | `DoNotSchedule` |
| `labelSelector` | `app: gistpin-backend` |

The backend uses a **maxSkew of 1** with **DoNotSchedule**, meaning Kubernetes will never allow more than one extra pod in any zone compared to another. If the constraint cannot be satisfied the pod stays Pending. This ensures the backend is always spread across zones for maximum availability.

## 3. Database — Best-Effort Zone Spread

| Field | Value |
|---|---|
| `maxSkew` | 2 |
| `topologyKey` | `topology.kubernetes.io/zone` |
| `whenUnsatisfiable` | `ScheduleAnyway` |
| `labelSelector` | `app: postgres` |

The database uses a **maxSkew of 2** with **ScheduleAnyway**. The wider skew tolerance accounts for the smaller replica count, and `ScheduleAnyway` prevents scheduling failures when there are fewer zones than replicas.

## 4. Max Skew Configuration Guidelines

- **maxSkew = 1**: Strict evenness. Use for stateless workloads (backend, frontend) where every replica is interchangeable.
- **maxSkew = 2**: Relaxed evenness. Use for stateful workloads (database, cache) where replica count may be small and the cost of unschedulable pods is high.
- Values above 2 are not recommended for production workloads.

## 5. Scheduling Constraints Reference

- **DoNotSchedule**: Hard constraint — the scheduler will not place the pod unless the skew is satisfied.
- **ScheduleAnyway**: Soft constraint — the scheduler places the pod and adjusts skew afterwards if possible.
- **topology.kubernetes.io/zone**: Standard label injected by cloud providers representing the availability zone.
- **kubernetes.io/hostname**: Represents an individual node; useful for host-level anti-affinity.
