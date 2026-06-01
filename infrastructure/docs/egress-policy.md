# Egress Network Policy

Restrict outbound traffic from GistPin pods to prevent data exfiltration, block cloud metadata access, and enforce DNS egress rules.

## Architecture

| Policy | Namespace | Scope | Purpose |
|--------|-----------|-------|---------|
| `egress-default-deny` | gistpin-dev, gistpin-staging, gistpin-prod | All pods | Default deny all outbound traffic |
| `egress-allowlist` | gistpin-dev, gistpin-staging, gistpin-prod | All pods | Allow DNS, blocked metadata, HTTPS |
| `egress-allowlist-backend` | All namespaces | Backend pods | Backend-specific DNS rules |
| `egress-allowlist-frontend` | All namespaces | Frontend pods | Frontend-specific DNS rules |

## Egress Allowlist

| Destination | Port | Protocol | Purpose |
|-------------|------|----------|---------|
| `postgres` pods | 5432 | TCP | Database connections |
| `redis` pods | 6379 | TCP | Cache connections |
| Cluster DNS | 53 | TCP/UDP | Service discovery via CoreDNS |
| Any IP | 443 | TCP | HTTPS egress to external endpoints |
| Metadata API | 443 | TCP | Blocked (redirected to 127.0.0.1:1) |

## Metadata API Blocking

Access to the AWS instance metadata API (`169.254.169.254`) is explicitly denied to prevent credential theft and SSRF-based attacks.

## Deployment

Apply the default deny policy first, then the allowlist:

```bash
kubectl apply -f infrastructure/k8s/network-policies/egress-default-deny.yaml
kubectl apply -f infrastructure/k8s/network-policies/egress-allowlist.yaml
```

Verify policies are active:

```bash
kubectl get networkpolicy -n gistpin-prod
kubectl describe networkpolicy egress-default-deny -n gistpin-prod
```

## Testing Egress Rules

```bash
kubectl exec -n gistpin-prod deploy/backend-deployment -- curl -sI https://api.gistpin.app
kubectl exec -n gistpin-prod deploy/backend-deployment -- curl -sI http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

## Monitoring

Track egress traffic using VPC Flow Logs:

```bash
kubectl logs -n kube-system -l k8s-app=cilium -f
```
