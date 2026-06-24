# DNS-Based Service Discovery Guide - GistPin

This document describes the DNS-based service discovery implementation in the GistPin Kubernetes cluster, enabling automatic service discovery and DNS resolution for all internal and external services.

## Overview

DNS-based service discovery (issue #557) is implemented using two core components:
1. **CoreDNS**: Internal cluster DNS resolver configured to handle `cluster.local` and `gistpin.local` domains
2. **External DNS**: Automatically creates DNS records in your cloud provider's DNS service for Kubernetes services and ingresses

## Architecture

```
                          ┌─────────────────────────┐
                          │      Cloud DNS          │
                          │  (gistpin.com records)  │
                          └─────────────────────────┘
                                   ▲
                                   │
                          ┌────────┴────────┐
                          │   External DNS   │
                          │ (sidecar process)│
                          └──────────────────┘
                                   ▲
                                   │
┌─────────────────┐        ┌──────┴────────┐
│  Frontend Pods   │ ─────► │   CoreDNS     │
│  Backend Pods    │        │  (cluster DNS)│
│  Database Pods   │ ◄──────┤               │
└─────────────────┘        └────────────────┘
```

## CoreDNS Configuration

CoreDNS is deployed in the `kube-system` namespace and configured to handle:
- Standard Kubernetes cluster DNS (`cluster.local`)
- Custom internal domain for GistPin services (`gistpin.local`)

### Configuration File
`infrastructure/k8s/dns/coredns-config.yaml`

Key features:
- Auto-discovers all Kubernetes services and pods
- Caches DNS responses for 30 seconds to reduce lookup overhead
- Exposes metrics on port 9153 for monitoring
- Supports load balancing and automatic config reloading

## External DNS Configuration

External DNS watches Kubernetes services and ingresses, automatically creating and updating DNS records in your cloud provider's DNS management system.

### Configuration File
`infrastructure/k8s/dns/external-dns.yaml`

### Supported Cloud Providers
Update the provider flag in external-dns.yaml to match your cloud environment:
- `google` for Google Cloud DNS
- `aws` for AWS Route53
- `azure` for Azure DNS
- `cloudflare` for Cloudflare DNS
- `digitalocean` for DigitalOcean DNS

### Service Annotations

All services in the cluster are annotated with DNS discovery labels to ensure proper DNS record creation:

#### Backend Service
```yaml
metadata:
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.gistpin.local,api.gistpin.com
    external-dns.alpha.kubernetes.io/internal-hostname: backend.internal.gistpin.local
```

#### Database Service (PostgreSQL)
```yaml
metadata:
  annotations:
    external-dns.alpha.kubernetes.io/internal-hostname: db.internal.gistpin.local
```

## DNS Namespace Convention

Internal service DNS names follow this pattern:
- `{service}.internal.gistpin.local` - Accessible only within the cluster
- `{subdomain}.gistpin.com` - Publicly accessible endpoints

Example resolutions:
- `backend.internal.gistpin.local` → Resolves to backend service ClusterIP
- `db.internal.gistpin.local` → Resolves to PostgreSQL headless service
- `api.gistpin.com` → Resolves to the external IP of your ingress controller
- `app.gistpin.com` → Resolves to the frontend service

## Usage Examples

### From within a pod
```bash
# Connect to database using DNS name
psql -h db.internal.gistpin.local -U myuser -d gistpin

# Call backend API using internal DNS
curl http://backend.internal.gistpin.local/api/health

# Access external endpoint from within the cluster
curl https://api.gistpin.com/api/v1/gists
```

### From external clients
```bash
# Public endpoints are resolvable from anywhere
curl https://api.gistpin.com/health
curl https://app.gistpin.com
```

## Installation and Setup

### Prerequisites
1. Kubernetes cluster 1.24+
2. Permissions to modify `kube-system` namespace
3. Cloud provider credentials for External DNS
4. Domain name registered and configured with your cloud provider

### Apply the configurations
```bash
# Apply CoreDNS config update
kubectl apply -f infrastructure/k8s/dns/coredns-config.yaml

# Apply External DNS
kubectl apply -f infrastructure/k8s/dns/external-dns.yaml

# Verify pods are running
kubectl get pods -n kube-system | grep -e coredns -e external-dns
```

## Monitoring and Debugging

### Verify CoreDNS is working
```bash
# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns

# View CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Test DNS resolution from a test pod
kubectl run -it --rm dnsutils --image=busybox:1.35 nslookup backend.internal.gistpin.local
```

### Verify External DNS is working
```bash
# Check external-dns pod status
kubectl get pods -n kube-system -l app=external-dns

# View external-dns logs to see DNS record creations
kubectl logs -n kube-system -l app=external-dns -f

# Verify records were created in your cloud provider's DNS console
```

### Common Issues and Troubleshooting

1. **Services not getting DNS records**:
   - Check external-dns logs for errors
   - Verify service annotations are correct
   - Ensure cloud provider credentials are properly configured

2. **Internal DNS resolution fails**:
   - Verify CoreDNS pods are running
   - Check that CoreDNS configmap was properly updated
   - Test resolution from a busybox pod in the cluster

3. **External DNS records not propagating**:
   - Check TTL settings on your DNS zone
   - Verify external-dns has necessary permissions to modify records
   - Use `dig` or `nslookup` to check current records

## Security Considerations

- **Internal services only resolve within the cluster**: The `.internal.gistpin.local` domain is only configured in CoreDNS, preventing external resolution
- **Network policies restrict DNS access**: Only cluster workloads can query CoreDNS
- **External DNS only creates records for explicitly annotated services**: Prevents accidental exposure of internal services
- **All DNS queries are logged**: For audit and monitoring purposes

## Best Practices

1. **Always use DNS names instead of hardcoded IPs** in application configurations
2. **Use headless services for stateful workloads** to get DNS records for individual pods
3. **Regularly audit DNS records** to ensure no stale or unused records remain
4. **Monitor DNS query metrics** through Prometheus to identify misconfigurations
5. **Use separate domains for different environments**: e.g., `api.dev.gistpin.com`, `api.staging.gistpin.com`, `api.gistpin.com`

## References
- [CoreDNS Official Documentation](https://coredns.io/)
- [External DNS GitHub Repository](https://github.com/kubernetes-sigs/external-dns)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [DNS Service Discovery Best Practices](https://kubernetes.io/docs/concepts/services-networking/service-discovery/)