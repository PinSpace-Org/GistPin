# Webhook Performance and Rate Limiting

This document describes the admission webhook rate limiting, timeout configuration, circuit breaker behavior, and performance monitoring for the GistPin Kubernetes cluster.

## Architecture Overview

```
API Server → AdmissionReview → Webhook Server → Validation Logic → Response
                                    ↑
                          Rate Limiter
                          Circuit Breaker
                          Request Queue
```

| Component | Purpose |
|-----------|---------|
| API Server | Sends admission review requests to webhook |
| Webhook Server | Evaluates admission policies, returns allow/deny |
| Rate Limiter | Prevents excessive requests from overwhelming the webhook |
| Circuit Breaker | Stops sending requests to unhealthy webhook instances |
| Request Queue | Buffers requests when webhook is at capacity |

## Timeout Configuration

### API Server Side (Webhook Spec)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `timeoutSeconds` | 3 | Max time API server waits for webhook response |
| Default | 10 | Kubernetes default if not specified |
| Recommended | 1-5 | Lower values reduce API server contention |

### Webhook Server Side

| Parameter | Value | Description |
|-----------|-------|-------------|
| `SERVER_TIMEOUT_MS` | 2500 | Server-side processing timeout |
| `MAX_CONCURRENT_REQUESTS` | 50 | Maximum simultaneous requests |
| `MAX_QUEUE_SIZE` | 200 | Maximum queued requests before rejection |

### Timeout Behavior

```
Request arrives → Queue (if at capacity) → Process → Respond
     ↓                ↓                      ↓          ↓
  Queue full    Timeout: 2.5s          Timeout: 3s    Success
     ↓                ↓                      ↓
  REJECT          REJECT                 REJECT
  (immediately)   (503 response)         (API server
                                          gives up)
```

## Failure Policy

| Policy | Behavior | Use Case |
|--------|----------|----------|
| `Fail` | Reject the API request if webhook fails | **Production** — enforce all policies |
| `Ignore` | Allow the API request to proceed if webhook fails | Development/staging — prevent outages from blocking work |

### Current Configuration

| Environment | `failurePolicy` | Rationale |
|-------------|----------------|-----------|
| prod | `Fail` | Must enforce resource validation |
| staging | `Fail` | Mirror production behavior |
| dev | `Ignore` | Prevent webhook issues from blocking development |

### Changing Failure Policy

```bash
# Temporarily set to Ignore during webhook maintenance
kubectl patch validatingwebhookconfiguration gistpin-resource-validator \
  --type='json' \
  -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Ignore"}]'

# Restore to Fail after maintenance
kubectl patch validatingwebhookconfiguration gistpin-resource-validator \
  --type='json' \
  -p='[{"op": "replace", "path": "/webhooks/0/failurePolicy", "value": "Fail"}]'
```

## Rate Limiting

### Per-Client Rate Limits

| Parameter | Value | Description |
|-----------|-------|-------------|
| `RATE_LIMIT_WINDOW_SECONDS` | 10 | Sliding window for rate calculation |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per client per window |

### Global Rate Limits

| Parameter | Value | Description |
|-----------|-------|-------------|
| `MAX_CONCURRENT_REQUESTS` | 50 | Max requests being processed simultaneously |
| `MAX_QUEUE_SIZE` | 200 | Max requests waiting in queue |

### Rate Limiting Algorithm

The webhook uses a **token bucket** algorithm:

1. Each client starts with `RATE_LIMIT_MAX_REQUESTS` tokens
2. Tokens are replenished at `RATE_LIMIT_MAX_REQUESTS / RATE_LIMIT_WINDOW_SECONDS` per second
3. Each request consumes one token
4. If no tokens remain, the request is rejected immediately with HTTP 429

### Monitoring Rate Limiting

```promql
# Rate of rejected requests
rate(webhook_rate_limit_rejected_total[5m])

# Queue depth
webhook_queue_depth{namespace="gistpin"}

# Active concurrent requests
webhook_active_requests{namespace="gistpin"}
```

### Tuning Rate Limits

If clients are being incorrectly rate-limited:

1. Check which client is hitting limits: `webhook_rate_limit_rejected_total{client="..."}` 
2. Determine if the client has legitimate burst traffic
3. Adjust `RATE_LIMIT_MAX_REQUESTS` in the ConfigMap:
   ```bash
   kubectl edit configmap webhook-rate-limits -n gistpin
   ```
4. Restart webhook pods to pick up new config:
   ```bash
   kubectl rollout restart deployment resource-validator -n gistpin
   ```

## Circuit Breaker

### States

| State | Value | Behavior |
|-------|-------|----------|
| Closed | 0 | Normal operation — all requests pass through |
| Half-Open | 0.5 | Recovery mode — limited probe requests allowed |
| Open | 1 | Failure mode — all requests rejected immediately |

### Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | 5 | Consecutive failures to trip circuit |
| `CIRCUIT_BREAKER_OPEN_DURATION_SECONDS` | 30 | Seconds before half-open probe |
| `CIRCUIT_BREAKER_HALF_OPEN_PROBES` | 3 | Successful probes to close circuit |

### State Transitions

```
CLOSED ──(5 consecutive failures)──→ OPEN
  ↑                                      │
  │                              (30 seconds)
  │                                      ↓
  └──(3 successful probes)── HALF-OPEN ←─┘
                                    │
                          (1 failure during probe)
                                    ↓
                                  OPEN
```

### Monitoring Circuit Breaker

```promql
# Current state
webhook_circuit_breaker_state{namespace="gistpin"}

# Trips per hour
increase(webhook_circuit_breaker_trips_total[1h])

# Consecutive failures
webhook_circuit_breaker_failures{namespace="gistpin"}
```

### Manual Override

```bash
# Force circuit breaker closed (resume traffic)
kubectl exec -n gistpin deployment/resource-validator -- \
  curl -X POST http://localhost:8080/admin/circuit-breaker/close

# Force circuit breaker open (stop all traffic)
kubectl exec -n gistpin deployment/resource-validator -- \
  curl -X POST http://localhost:8080/admin/circuit-breaker/open
```

## Performance Monitoring

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `webhook_request_duration_seconds` | Histogram | Request processing latency |
| `webhook_request_total` | Counter | Total requests by status |
| `webhook_request_errors_total` | Counter | Errors by type |
| `webhook_rate_limit_rejected_total` | Counter | Rate-limited requests |
| `webhook_queue_depth` | Gauge | Current queue size |
| `webhook_active_requests` | Gauge | Currently processing |
| `webhook_circuit_breaker_state` | Gauge | Circuit breaker state |
| `webhook_request_timeouts_total` | Counter | Timed-out requests |

### Dashboard Queries

**Request Rate:**
```promql
sum(rate(webhook_request_total{namespace="gistpin"}[5m])) by (status)
```

**Latency Distribution:**
```promql
histogram_quantile(0.50, rate(webhook_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(webhook_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(webhook_request_duration_seconds_bucket[5m]))
```

**Error Rate:**
```promql
sum(rate(webhook_request_errors_total{namespace="gistpin"}[5m])) by (error_type)
/
sum(rate(webhook_request_total{namespace="gistpin"}[5m]))
```

**Capacity Utilization:**
```promql
webhook_active_requests{namespace="gistpin"} / 50 * 100
```

### Prometheus Alerts

All webhook alerts are defined in `infrastructure/monitoring/webhook-metrics.yml`. Key alerts:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| `WebhookHighLatency` | P99 > 2.5s for 3m | warning |
| `WebhookTimeoutRateHigh` | > 5% for 2m | critical |
| `WebhookCircuitBreakerOpen` | State = 1 for 1m | critical |
| `WebhookRateLimitRejects` | > 1/sec for 3m | warning |
| `WebhookQueueDepthHigh` | > 150 for 5m | warning |
| `WebhookQueueDepthCritical` | > 190 for 2m | critical |
| `WebhookHighErrorRate` | > 10% for 3m | warning |
| `WebhookServerDown` | Up = 0 for 1m | critical |

## Troubleshooting

### Webhook Timeout — API Server Logs

```
Error: timeout or deadline exceeded on webhook resource-validator.gistpin.io
```

**Causes:**
- Webhook server overloaded (high CPU/memory)
- Network latency between API server and webhook pod
- Webhook processing logic too slow
- Database/query timeout within webhook handler

**Resolution:**
1. Check webhook pod resources: `kubectl top pod -n gistpin -l app=resource-validator`
2. Review webhook logs: `kubectl logs -n gistpin -l app=resource-validator --tail=100`
3. If sustained, increase `timeoutSeconds` temporarily (max 30s)
4. Scale up webhook replicas: `kubectl scale deployment resource-validator -n gistpin --replicas=3`

### High Rate Limit Rejects

**Causes:**
- Client sending burst traffic (e.g., bulk operations)
- Rate limit too restrictive for workload
- Client not implementing backoff

**Resolution:**
1. Identify client: check `webhook_rate_limit_rejected_total{client="..."}`
2. If legitimate, increase `RATE_LIMIT_MAX_REQUESTS` in ConfigMap
3. If abusive, investigate client and add backoff logic

### Circuit Breaker Keeps Tripping

**Causes:**
- Webhook server crashing or returning errors
- Backend dependency (database) unavailable
- Network partition between API server and webhook

**Resolution:**
1. Check webhook health endpoint: `kubectl exec -n gistpin deploy/resource-validator -- curl localhost:8080/health`
2. Check backend dependencies
3. If webhook server is healthy, adjust `CIRCUIT_BREAKER_FAILURE_THRESHOLD`
4. As last resort, manually force circuit closed

## Scaling Considerations

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: resource-validator-hpa
  namespace: gistpin
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resource-validator
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: webhook_active_requests
        target:
          type: AverageValue
          averageValue: "30"
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Resource Limits

| Resource | Request | Limit | Notes |
|----------|---------|-------|-------|
| CPU | 250m | 1000m | Increase if seeing throttling |
| Memory | 256Mi | 512Mi | Increase if seeing OOMKilled |
| Replicas | 2 | 10 | Scale based on active requests |

## Migration Notes

- **Webhook server migration**: Always update `failurePolicy` to `Ignore` before migrating the webhook server deployment.
- **Certificate rotation**: cert-manager handles rotation automatically. If manually rotating, ensure the CA bundle in `webhook-config.yaml` matches.
- **Namespace migration**: Update `namespaceSelector` if moving webhook to a different namespace.
- **New webhook addition**: Add to `webhook-config.yaml` and ensure the new webhook follows the same rate limiting and circuit breaker patterns.
