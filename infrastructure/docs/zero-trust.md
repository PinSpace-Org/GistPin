# Zero-trust network access

This baseline implementation brings zero-trust controls to internal service communication for GistPin.

## Objectives

- Enforce mutual TLS between services
- Rotate certificates automatically before expiry
- Base access on workload identity rather than network location
- Emit audit logs for service-to-service access decisions
- Apply policy at the mesh layer for continuous enforcement

## Components

- mTLS policies in [infrastructure/security/zero-trust/mtls-config.yaml](../security/zero-trust/mtls-config.yaml)
- Certificate issuance and rotation in [infrastructure/security/zero-trust/cert-manager.yaml](../security/zero-trust/cert-manager.yaml)

## Implementation notes

### 1. Mutual TLS

The mesh policy in the zero-trust configuration enables strict mTLS for workloads in the `gistpin` namespace. Traffic that does not present a valid client certificate is rejected before reaching the application.

### 2. Certificate rotation

The certificate manifest uses `cert-manager` to issue a workload certificate with a 90-day validity period and a 9-day renewal window. This keeps the service identity material fresh without manual intervention.

### 3. Identity-based access

Authorization policies use SPIFFE-style service identities from Kubernetes service accounts. This allows the platform to permit only approved workloads to access specific APIs.

### 4. Audit logging

Enable access logs and policy audit logs in the service mesh control plane so each allowed and denied request is traceable. Forward these logs to the central observability stack.

### 5. Policy enforcement

Treat the manifests in this folder as the default baseline and add namespace-specific policies as new services are onboarded. Review policies regularly and keep an allow-list approach for internal API access.

## Apply the baseline

```bash
kubectl apply -f infrastructure/security/zero-trust/mtls-config.yaml
kubectl apply -f infrastructure/security/zero-trust/cert-manager.yaml
```

## Operational checklist

- Verify that the mesh control plane is installed and running
- Confirm `cert-manager` is deployed and healthy
- Check that service-to-service traffic is using mTLS
- Review certificate expiry and renewal events in the cluster
- Monitor audit logs for policy violations and unexpected access paths
