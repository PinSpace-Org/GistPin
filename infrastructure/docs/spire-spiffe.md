# SPIFFE/SPIRE — Distributed Secret Management & Workload Identity

## Overview

GistPin uses **SPIRE** (SPIFFE Runtime Environment) to issue machine and workload
identities as **SVIDs** (SPIFFE Verifiable Identity Documents). Workloads are
attested against the trust domain `gistpin.local` and obtain short-lived
credentials (and derived secrets) from the **Workload API**, eliminating static
long-lived secrets stored in the cluster.

## Architecture

```
Workload (backend pod)
   │  dials Workload API socket (/run/spire/sockets/agent.sock)
   ▼
SPIRE Agent (DaemonSet, per node) — node attestation via k8s_sat
   │
   ▼
SPIRE Server (StatefulSet) — issues SVIDs, manages trust domain gistpin.local
   ▲
SPIRE Controller Manager — reconciles ClusterSPIFFEID registration entries
```

| Component | File | Purpose |
|-----------|------|---------|
| SPIRE Server | `infrastructure/k8s/spire/server.yaml` | Issues SVIDs, holds trust bundle, CA rotation |
| SPIRE Agent | `infrastructure/k8s/spire/agent-daemonset.yaml` | Node attestation + Workload API |
| Controller Manager | `infrastructure/k8s/spire/cluster-spiffe-id.yaml` | Auto-registers workloads (ClusterSPIFFEID) |
| Istio integration | `infrastructure/docs/spire-istio.md` | Serve SVIDs to sidecars |
| Root rotation | `infrastructure/scripts/rotate-spire-roots.sh` | Rotate trust bundle + CA |

## Deployment

```bash
kubectl create namespace spire
kubectl apply -f infrastructure/k8s/spire/server.yaml
kubectl apply -f infrastructure/k8s/spire/agent-daemonset.yaml
kubectl apply -f infrastructure/k8s/spire/cluster-spiffe-id.yaml
```

## Trust Domain & Registration

The trust domain is `gistpin.local`. The `ClusterSPIFFEID` resources in
`cluster-spiffe-id.yaml` define which workloads get an SVID and under what
SPIFFE ID, e.g.:

```
spiffe://gistpin.local/ns/gistpin/sa/backend
spiffe://gistpin.local/db/gistpin/<pod>
```

The controller manager watches these CRDs and keeps the SPIRE server's
registration entries in sync, so new workloads are auto-ssingcal indexes.

## Certificate Rotation Automation

SPIRE rotates SVIDs automatically via the Workload API. Configuration for
rotation lives in `server.yaml` / `agent.conf`:

| Item | Default | Location |
|------|---------|----------|
| Workload SVID TTL | `12h` | agent.conf (`default_ttl`) |
| Server CA TTL | `24h` | server.yaml (`ca_ttl`) |
| CA rotation interval | `24h` | server.yaml (`ca_rotation_interval`) |

To rotate the **root trust bundle** invoke:

```bash
./infrastructure/scripts/rotate-spire-roots.sh              # rotate now
./infrastructure/scripts/rotate-spire-roots.sh --interval 12
./infrastructure/scripts/rotate-spire-roots.sh --dry-run
```

The script:

1. Exports the current bundle via the SPIRE server CLI.
2. Rotates the server CA / SVID roots with `spiffeid rotate`.
3. Re-distributes the fresh bundle to agents (ConfigMap).
4. Restarts the server StatefulSet and agent DaemonSet.

Rotation is scheduled in CI with a cron workflow (see
`infrastructure/ci/*.yml` conventions) or Kubernetes CronJob.

## Secret Distribution

Because SVIDs are short-lived and bound to the workload's identity, secrets can
be exchanged over mTLS using SPIFFE IDs as the identity of record, removing the
need for shared long-lived API keys on the wire. Derived secrets can be fetched
from the Workload API via an init container and mounted to the pod without
storing static credentials in Secrets.

## Verification

```bash
# Confirm the trust bundle
kubectl exec -n spire deploy/spire-server -- /opt/spire/bin/spire-server bundle show

# Verify the agent is attested
kubectl exec -n spire deploy/spire-server -- \
  /opt/spire/bin/spire-server entry show

# Request an SVID for a workload against the Workload API
kubectl exec -n gistpin <backend-pod> -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Content-Type: application/json" \
  --unix-socket /run/spire/sockets/agent.sock \
  http://localhost/api/agent | grep 200
```

## Security Notes

- Keep the SPIRE server's `spire-data` volume out of public snapshots.
- The bootstrap trust bundle (`bootstrap.pem`) should be signed by a real root
  CA in production, not the `insecure_bootstrap` default used here for dev.
- Restrict Workload API socket access to intended workloads via Pod Security
  Policies / securityContext.
