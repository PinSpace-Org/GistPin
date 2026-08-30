# Alertmanager High Availability

Alertmanager runs in a 3-replica HA cluster so that alert delivery survives the
loss of a node or a replica — a monitoring system that can go down with the
thing it monitors is not much use during an incident.

## How HA works

Alertmanager HA is **not** leader/follower. All three replicas are active and
form a **gossip cluster** (HashiCorp memberlist) over port 9094:

- Prometheus is configured to send every alert to **all** Alertmanager replicas.
- The replicas gossip their notification log, so exactly one notification is
  sent per alert group — the cluster **de-duplicates** rather than each replica
  paging independently.
- Silences created on any replica propagate to all, so a silence applies
  cluster-wide.

## Components

| File                                              | Purpose                                             |
| ------------------------------------------------- | --------------------------------------------------- |
| `infrastructure/monitoring/alertmanager-ha.yaml`  | 3-replica StatefulSet with gossip args + config + per-replica storage. |
| `infrastructure/monitoring/alertmanager-service.yaml` | Headless (gossip) service, LB service, and PDB.  |
| `infrastructure/docs/alertmanager-ha.md`          | This document.                                      |

## Gossip cluster

Each replica peers with the other two via the **headless service**
`alertmanager-cluster`, which gives every pod a stable DNS name
(`alertmanager-0.alertmanager-cluster.monitoring.svc`, …). The StatefulSet's
`--cluster.peer` args reference those names, and `publishNotReadyAddresses: true`
lets peers find each other before they report Ready.

## Shared state (silences & notification log)

Each replica has its own `ReadWriteOnce` PVC (via `volumeClaimTemplates`) so its
silences and notification-log survive a restart. The gossip protocol keeps the
three copies converged, so a silence or a "already notified" record set on one
replica is honored by all.

## Deduplication

Two layers ensure a single page per incident:

1. **Grouping** — `group_by: [alertname, cluster, service]` collapses related
   alerts into one notification.
2. **Cluster notification log** — gossip ensures that even though all three
   replicas receive the alert, only one actually sends the notification.

## Load balancing receivers

Prometheus points at the `alertmanager` ClusterIP service, which fans out to the
replicas. Because the cluster de-duplicates, it doesn't matter which replica
handles a given alert — there is no "primary".

## Resilience

- **Pod anti-affinity** spreads the three replicas across nodes, so one node
  loss removes at most one replica.
- **PodDisruptionBudget** (`minAvailable: 2`) prevents a drain/upgrade from
  taking more than one replica down at a time, preserving the cluster's state
  quorum.

## Verifying the cluster

```bash
# All three peers should be visible from any replica:
kubectl -n monitoring exec alertmanager-0 -- \
  wget -qO- http://localhost:9093/api/v2/status | jq '.cluster.peers | length'
# -> 3
```
