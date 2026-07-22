# GistPin Ephemeral Containers Debugging Guide

This guide covers using Kubernetes ephemeral containers for live debugging of GistPin pods.

## Overview

Ephemeral containers allow you to attach debug containers to running pods without modifying the original pod spec. This is invaluable for:

- Debugging production issues without restarting pods
- Inspecting network connectivity and DNS resolution
- Analyzing running processes and resource usage
- Testing connectivity to external services
- Investigating application state and memory

## Prerequisites

- Kubernetes cluster v1.16+ with ephemeral containers feature enabled
- `kubectl` configured with appropriate cluster access
- Debug service account (`debug-sa`) with proper RBAC
- Approved debug container images (see below)

## Approved Debug Images

| Image | Use Case |
|-------|----------|
| `nicolaka/netshoot:latest` | Network diagnostics (default) |
| `busybox:latest` | Basic networking, DNS, file operations |
| `curlimages/curl:latest` | HTTP/API testing |
| `alpine:latest` | Lightweight general debugging |
| `python:3.11-slim` | Python application debugging |
| `node:18-slim` | Node.js application debugging |

**Important**: Only approved images may be used in production namespaces. The `debug-pod.sh` script validates images against this list.

## Quick Start

### Debug a Pod

```bash
# Basic debug session
./infrastructure/scripts/debug-pod.sh -p <pod-name> -n gistpin-prod

# Use a specific image
./infrastructure/scripts/debug-pod.sh -p <pod-name> -i busybox:latest

# Non-interactive mode (logs only)
./infrastructure/scripts/debug-pod.sh -p <pod-name> --non-interactive

# Dry run (show what would happen)
./infrastructure/scripts/debug-pod.sh -p <pod-name> --dry-run
```

### List Available Pods

```bash
kubectl get pods -n gistpin-prod
```

### List Approved Images

```bash
./infrastructure/scripts/debug-pod.sh --list-images
```

## RBAC Configuration

The debug role (`infrastructure/k8s/rbac/debug-role.yaml`) grants the following permissions:

### Namespace-scoped (gistpin)

| Resource | Verbs |
|----------|-------|
| pods | get, list, watch |
| pods/exec | create |
| pods/attach | create |
| pods/portforward | create |
| pods/log | get |
| pods/status | get |
| pods/proxy | create |
| services | get, list |
| endpoints | get, list |
| configmaps | get, list |

### Cluster-scoped

| Resource | Verbs |
|----------|-------|
| namespaces | get, list |
| nodes | get, list |
| pods | get, list, watch |
| events | get, list |

### Service Account

- **Name**: `debug-sa`
- **Namespace**: `gistpin-debug`
- **Bindings**: RoleBinding (gistpin namespace) + ClusterRoleBinding (cluster-wide)

## Deployment

Apply the debug RBAC configuration:

```bash
kubectl apply -f infrastructure/k8s/rbac/debug-role.yaml
```

This creates:
- `gistpin-debug` namespace
- Debug configuration and scripts
- Service account with proper RBAC
- Audit logging configuration

## Usage Examples

### Network Debugging

```bash
# Debug network connectivity from a pod
kubectl debug -it <pod-name> -n gistpin-prod --image=nicolaka/netshoot:latest

# Inside the debug container:
ping backend-service.gistpin-prod.svc.cluster.local
nslookup api.stellar.org
curl -v http://backend-service/health
```

### Process Inspection

```bash
# Attach debug container and inspect processes
kubectl debug -it <pod-name> -n gistpin-prod --image=alpine:latest

# Inside the debug container:
ps aux
top -bn1
cat /proc/1/cmdline
```

### File System Debugging

```bash
# Access file system of running pod
kubectl debug -it <pod-name> -n gistpin-prod --image=alpine:latest

# Inside the debug container:
ls -la /app/
cat /app/config.json
find / -name "*.log" 2>/dev/null
```

### Database Connectivity

```bash
# Test database connectivity
kubectl debug -it <pod-name> -n gistpin-prod --image=postgres:15

# Inside the debug container:
psql $DATABASE_URL -c "SELECT 1"
```

## Audit Logging

All debug sessions are logged to:

```
/var/log/gistpin/debug-audit.log
```

Log entries include:
- Timestamp
- Action (create, session start/end, cleanup)
- User performing the action
- Target namespace, pod, and container
- Image used
- Session status
- Timeout configuration

### Example Audit Log Entry

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "action": "debug_session_start",
  "user": "developer",
  "namespace": "gistpin-prod",
  "pod": "backend-abc123",
  "container": "debug-1705312200",
  "image": "nicolaka/netshoot:latest",
  "status": "initiated",
  "timeout": "3600"
}
```

## Security Considerations

### Container Security

- Debug containers run with `SYS_PTRACE` capability for process inspection
- Containers run as root (required for some debugging operations)
- Resource limits are enforced (CPU: 200m, Memory: 128Mi)

### Image Validation

- Only pre-approved images may be used
- Image validation occurs before container creation
- Custom images require approval via configuration update

### Access Control

- Debug access is restricted to the `debug-sa` service account
- RBAC limits operations to necessary actions only
- Audit logging tracks all debug activities

### Cleanup

- Debug containers persist until pod termination
- Use `--cleanup` flag to log cleanup actions
- Monitor debug container count in production namespaces

## Troubleshooting

### "Ephemeral containers API not available"

Ensure your cluster supports ephemeral containers (Kubernetes v1.16+). Check with:

```bash
kubectl api-resources | grep ephemeralcontainers
```

### "Image not in approved list"

Only approved images can be used. Check the list:

```bash
./infrastructure/scripts/debug-pod.sh --list-images
```

To add images, update the `APPROVED_IMAGES` list in:
- `infrastructure/k8s/rbac/debug-role.yaml` (ConfigMap)
- `infrastructure/scripts/debug-pod.sh` (script variable)

### "Permission denied"

Ensure the debug RBAC is applied:

```bash
kubectl apply -f infrastructure/k8s/rbac/debug-role.yaml
kubectl get clusterrole debug-cluster-role
kubectl get rolebinding debug-rolebinding -n gistpin
```

### "Pod not found"

Verify the pod exists and you have access:

```bash
kubectl get pods -n <namespace> | grep <pod-name>
```

## Best Practices

1. **Use the default image** (`nicolaka/netshoot:latest`) unless you need specific tools
2. **Set appropriate timeouts** to prevent orphaned debug containers
3. **Clean up** after debugging sessions
4. **Review audit logs** regularly for security compliance
5. **Use dry-run mode** to verify actions before execution
6. **Document findings** before terminating debug sessions
7. **Limit debug sessions** in production to minimize resource impact

## Related Documentation

- [Kubernetes Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [kubectl debug](https://kubernetes.io/docs/tasks/debug/debug-container/kubernetes-debugging-running-pod/)
- [GistPin Security Hardening](./security-hardening.md)
- [GistPin Incident Response](./incident-response.md)
