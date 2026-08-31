# Kubernetes Control Plane Audit Logging

The API server records an audit trail of every request against the control
plane. This document describes the audit policy, log shipping to the SIEM,
alerting on sensitive operations, and the one-year retention requirement.

## Audit policy

`infrastructure/k8s/audit/audit-policy.yaml` is supplied to the API server via
`--audit-policy-file`. Rules are evaluated top-down; the first match wins. The
policy is tuned to capture what matters without drowning in noise:

| Category                                    | Level             | Why |
| ------------------------------------------- | ----------------- | --- |
| kube-proxy watches, node gets, health/metrics URLs | `None`     | High volume, no security value. |
| Secrets & ConfigMaps                        | `Metadata`        | Record access **without** logging secret values. |
| RBAC / webhook config writes                | `RequestResponse` | Full detail on privilege and admission changes. |
| `pods/exec`, `attach`, `portforward`        | `RequestResponse` | Interactive access is high-risk. |
| Auth reviews (token/subjectaccess)          | `Metadata`        | Who attempted what. |
| Workload writes (pods, deployments, jobs)   | `Request`         | Capture the spec that was applied. |
| Everything else                             | `Metadata`        | Baseline coverage. |

`omitStages: [RequestReceived]` drops the pre-authorization stage so each event
is logged once, at completion.

## Log shipping

`infrastructure/k8s/audit/log-shipping.yaml` runs a fluent-bit DaemonSet on the
control-plane nodes that tails `/var/log/kubernetes/audit/audit.log` and forwards
each event to the SIEM over TLS.

> On a managed control plane (EKS) the audit log is delivered to CloudWatch
> Logs directly; the DaemonSet is for self-managed / kubeadm control planes that
> write the audit log to the host.

## Sensitive operation alerting

Audit events feed Prometheus alerts (`audit-sensitive-op-alerts` ConfigMap):

- **`ClusterRoleBindingModified`** — a cluster-wide RBAC binding changed.
- **`PodExecInvoked`** — an interactive `exec`/`attach` session was opened.

Extend the alert set as new sensitive verbs/resources warrant real-time
attention.

## Retention (1 year)

Audit records are compliance evidence and are retained for **one year**:

- The SIEM applies a 365-day retention policy to the `gistpin-control-plane-audit`
  pipeline.
- Where audit logs also land in object storage, the bucket lifecycle keeps them
  for 365 days before expiry.

## Verifying

```bash
# Confirm the API server is loading the policy (self-managed)
ps aux | grep kube-apiserver | grep audit-policy-file

# Tail recent audit events on a control-plane node
sudo tail -f /var/log/kubernetes/audit/audit.log | jq '{user: .user.username, verb, resource: .objectRef.resource}'
```
