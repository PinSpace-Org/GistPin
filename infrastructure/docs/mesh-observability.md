# Service Mesh Observability

Grafana dashboard and Prometheus alerting rules for Istio service mesh visibility.

## Dashboard Panels

| Panel | Metric | Purpose |
|-------|--------|---------|
| Request Volume per Service | `istio_requests_total` | Traffic rate by destination |
| Error Rate by Service Pair | `istio_requests_total{response_code=~"5.."}` | 5xx rate per source→dest pair |
| P99 Latency Heatmap | `istio_request_duration_milliseconds_bucket` | Tail latency distribution |
| Retries / Circuit Breaker | `response_flags=~"URX\|UO"` | Overflow and retry events |
| mTLS Coverage | `connection_security_policy="mutual_tls"` | Percentage of encrypted traffic |

## Alerts

- **MeshHighErrorRate** — error rate >5% for 2m → warning
- **MeshHighLatencyP99** — P99 >1s for 5m → warning
- **MeshCircuitBreakerOpen** — any UO flag for 1m → critical
- **MeshMTLSCoverageBelow90** — mTLS <90% for 5m → warning

## Setup

1. Import `grafana/mesh-observability.json` into Grafana
2. Apply `istio-metrics.yml` to Prometheus rule ConfigMap:
   ```bash
   kubectl apply -f infrastructure/monitoring/istio-metrics.yml -n monitoring
   ```
3. Ensure Istio telemetry v2 is enabled in your mesh config
