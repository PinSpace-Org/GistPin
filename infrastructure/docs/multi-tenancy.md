# Kubernetes Multi-Tenancy Isolation Framework

This framework lets GistPin run multiple isolated tenants on a shared
Kubernetes cluster with strong, layered isolation — without paying the cost of
one cluster per tenant.

## Architecture

Each tenant gets a rendered copy of
[`k8s/multi-tenancy/tenant-template.yaml`](../k8s/multi-tenancy/tenant-template.yaml),
provisioned by [`scripts/onboard-tenant.sh`](../scripts/onboard-tenant.sh).

### Isolation layers (defense in depth)

| Layer            | Mechanism                                        | What it prevents                                  |
| ---------------- | ------------------------------------------------ | ------------------------------------------------- |
| API objects      | Dedicated namespace `tenant-<name>`              | Cross-tenant object visibility / name collisions   |
| Compute          | `ResourceQuota` (tier-sized) + `LimitRange`      | Noisy-neighbor CPU/memory/PVC exhaustion           |
| Network          | Default-deny `NetworkPolicy` + DNS-only egress   | East-west attacks, cross-tenant service discovery  |
| Identity         | Namespace-scoped `Role` + dedicated ServiceAccount | Tenant workloads touching cluster-scoped APIs    |
| Pod security     | Namespace labels (`pod-security.kubernetes.io`)  | Privileged containers in tenant namespaces         |

### Virtual cluster approach

For tenants that need full control-plane access (custom CRDs, admission
webhooks), deploy a **virtual cluster** (e.g. vcluster) *inside* the tenant
namespace instead of granting shared-cluster permissions:

```bash
vcluster create <tenant-name> \
  --namespace tenant-<tenant-name> \
  --connect=false
```

The virtual cluster's kubeconfig is scoped to its own control plane; it still
consumes the namespace's ResourceQuota and obeys its NetworkPolicies, so the
isolation guarantees of this framework hold. Use virtual clusters sparingly —
most tenants only need the namespaced Role.

## Quota tiers

| Tier   | requests.cpu | requests.memory | limits.cpu | limits.memory | PVCs | Pods |
| ------ | ------------ | --------------- | ---------- | ------------- | ---- | ---- |
| small  | 500m         | 1Gi             | 2          | 4Gi           | 5    | 20   |
| medium | 2000m        | 4Gi             | 6          | 12Gi          | 20   | 60   |
| large  | 6000m        | 12Gi            | 16         | 32Gi          | 50   | 200  |

Tune tiers in `scripts/onboard-tenant.sh`; keep the template generic.

## Onboarding a tenant

```bash
# small tier is the default
./infrastructure/scripts/onboard-tenant.sh acme-corp medium
```

The script validates the tenant name, refuses collisions, renders the template
(`envsubst`) into `k8s/multi-tenancy/rendered/<name>.yaml`, applies it, and
verifies quota/network/RBAC objects landed. Rendered manifests are kept in git
for drift review.

### Verifying isolation

Cross-namespace traffic must fail from any tenant:

```bash
kubectl run netcheck --image=busybox --restart=Never -n tenant-acme-corp \
  -- wget -qO- --timeout=3 http://gistpin-backend.gistpin.svc:3000/health && echo LEAK || echo ISOLATED
```

Quota enforcement:

```bash
kubectl describe resourcequota tenant-quota -n tenant-acme-corp
```

## Offboarding

```bash
kubectl delete namespace tenant-acme-corp   # cascades all tenant objects
rm infrastructure/k8s/multi-tenancy/rendered/acme-corp.yaml
```

## Enforcement & audit

- Kyverno policies under `k8s/kyverno/policies/` require resource limits and
  GistPin labels on all new namespaces — tenant onboarding satisfies both.
- The `gistpin.io/tenant` label drives cost allocation dashboards
  (`monitoring/grafana/quota-dashboard.json`).
- Review rendered manifests via PR; direct `kubectl apply` to production
  tenants is restricted through RBAC on the ops side.
