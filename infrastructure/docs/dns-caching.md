# NodeLocal DNSCache

## Overview
Deploys a DNS cache DaemonSet on each node to reduce DNS lookup latency.

## Architecture
- Runs on hostNetwork with a local IP (169.254.20.10)
- Caches cluster DNS responses locally
- Falls back to CoreDNS for uncached queries

## Performance
- Expected P99 latency reduction: 60-80%
- Cache hit ratio target: >90%

## Verification
```bash
kubectl exec -n kube-system ds/node-local-dns -- wget -qO- http://localhost:9253/metrics
```
