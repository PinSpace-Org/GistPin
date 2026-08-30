# OPA Gatekeeper — Pod Security Context Enforcement

GistPin uses [OPA Gatekeeper](https://open-policy-agent.github.io/gatekeeper/) to
enforce that every pod runs with a hardened security context. This document
covers installation, the policy, and the audit-then-enforce rollout.

## The policy

`ConstraintTemplate` `k8srequiredsecuritycontext` (in
`templates/security-context.yaml`) requires:

| Rule                                              | Scope      |
| ------------------------------------------------- | ---------- |
| `securityContext.runAsNonRoot: true`              | pod        |
| `allowPrivilegeEscalation: false`                 | container  |
| `readOnlyRootFilesystem: true`                    | container (exemptable) |
| `capabilities.drop: ["ALL"]`                      | container  |

The `readOnlyRootFilesystem` rule supports an `exemptImages` allowlist for the
rare image that genuinely needs a writable root.

## Components

| File                                                                     | Purpose                              |
| ------------------------------------------------------------------------ | ------------------------------------ |
| `infrastructure/k8s/gatekeeper/templates/security-context.yaml`          | ConstraintTemplate (Rego policy).    |
| `infrastructure/k8s/gatekeeper/constraints/require-security-context.yaml`| Constraint (scope + enforcement mode).|
| `infrastructure/docs/gatekeeper-setup.md`                                | This document.                       |

## Installation

```bash
# Install Gatekeeper
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm install gatekeeper gatekeeper/gatekeeper --namespace gatekeeper-system --create-namespace

# Apply the template, then the constraint
kubectl apply -f infrastructure/k8s/gatekeeper/templates/security-context.yaml
kubectl apply -f infrastructure/k8s/gatekeeper/constraints/require-security-context.yaml
```

## Audit-then-enforce rollout

Blocking non-compliant pods on day one would break existing workloads. The
rollout is staged:

1. **Audit (dryrun)** — the cluster-wide constraint ships with
   `enforcementAction: dryrun`. Gatekeeper records violations without blocking:

   ```bash
   kubectl get k8srequiredsecuritycontext require-security-context -o json \
     | jq '.status.violations'
   ```

2. **Remediate** — fix the reported workloads (add the missing security context
   fields) or add a justified image to `exemptImages`.

3. **Enforce (deny)** — flip `enforcementAction` to `deny`. The example
   `require-security-context-backend` constraint shows a single namespace being
   enforced first while the rest stay in dryrun — a safe per-namespace ramp.

## Scope

The constraint excludes system namespaces (`kube-system`, `gatekeeper-system`,
etc.) where components legitimately require broader privileges. Enforcement
applies only to application namespaces.

## Verifying enforcement

```bash
# This should be denied once the backend namespace is in deny mode:
kubectl -n backend run bad --image=nginx --restart=Never
# Error from server: admission webhook denied the request:
#   container "bad" must set securityContext.readOnlyRootFilesystem: true ...
```
