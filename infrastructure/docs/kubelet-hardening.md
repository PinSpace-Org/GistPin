# Kubelet Hardening

## CIS Benchmark Configuration

- Anonymous authentication: disabled
- Webhook authorization: enabled
- Event record limits: 5 QPS / 10 burst
- Certificate rotation: enabled
- Server TLS bootstrap: enabled

## Verification
```bash
kubectl get nodes -o json | jq '.items[].status.nodeInfo.kubeletVersion'
```
