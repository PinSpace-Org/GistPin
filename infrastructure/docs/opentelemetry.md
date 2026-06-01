# OpenTelemetry Collector Setup Guide

## Overview

The OpenTelemetry collector runs as a unified telemetry pipeline, receiving signals from GistPin services and exporting them to backends (Prometheus, Jaeger, Loki).

## Architecture

```
OpenTelemetry Collector (otel-collector)
├── Receivers
│   ├── OTLP gRPC (4317) - traces, metrics, logs
│   ├── OTLP HTTP (4318) - traces, metrics, logs
│   ├── Jaeger gRPC (14250) - legacy traces
│   ├── Jaeger Thrift HTTP (14268) - legacy traces
│   ├── Prometheus scraper - self-monitoring
│   └── File log (filelog) - application logs
│
├── Processors
│   ├── attributes - enrichment and PII redaction
│   ├── batch - batching for throughput
│   ├── probabilistic_sampler - head-based trace sampling
│   └── tail_sampling - dynamic sampling decisions
│
└── Exporters
    ├── Prometheus Remote Write - metrics to Prometheus
    ├── Jaeger - traces to Jaeger
    ├── Loki - logs to Loki
    └── OTLP - forward to backend collector
```

## Deployment

### Docker Compose

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.100.0
    command: ["--config=/etc/otelcol/otel-collector.yml"]
    volumes:
      - ./otel-collector.yml:/etc/otelcol/otel-collector.yml
      - ./otel-pipelines.yml:/etc/otelcol/otel-pipelines.yml
      - ./logs:/var/log/gistpin
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "55679:55679" # zPages
      - "1777:1777"   # pprof
      - "8888:8888"   # metrics
      - "13133:13133" # health check
    environment:
      - DEPLOY_ENV=${DEPLOY_ENV:-production}
    depends_on:
      - prometheus
      - jaeger
      - loki
    restart: unless-stopped
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    spec:
      containers:
        - name: otel-collector
          image: otel/opentelemetry-collector-contrib:0.100.0
          args: ["--config=/conf/otel-collector.yml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 8888
              name: metrics
            - containerPort: 13133
              name: health
          volumeMounts:
            - name: config
              mountPath: /conf
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Application Instrumentation

### Node.js (GistPin Backend)

```bash
npm install @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-trace-otlp-grpc \
            @opentelemetry/exporter-metrics-otlp-grpc
```

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  serviceName: 'gistpin-backend',
  serviceVersion: process.env.npm_package_version,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
  }),
  metricExporter: new OTLPMetricExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
  }),
  logRecordExporter: new OTLPLogExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317'
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Frontend (Browser)

```bash
npm install @opentelemetry/sdk-browser \
            @opentelemetry/auto-instrumentations-web \
            @opentelemetry/exporter-trace-otlp-http
```

```javascript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const tracerProvider = new WebTracerProvider();
const exporter = new OTLPTraceExporter({
  url: '/v1/traces',
});

tracerProvider.addSpanProcessor(new BatchSpanProcessor(exporter));
tracerProvider.register();
```

## Sampling Configuration

Head-based sampling (in instrumented app):
- `probabilistic_sample_rate: 0.1` - 10% of traces sampled at origin
- Hash-based consistent sampling per user ID

Tail-based sampling (in collector):
- Error traces: always sampled
- Latency > 1.5s: always sampled
- Random 5% of remaining traffic
- UNSET status codes: sampled

## Pipeline Overview

| Signal   | Receivers             | Processors                   | Exporters                      |
|----------|----------------------|------------------------------|--------------------------------|
| Traces   | otlp, jaeger          | attributes, tail_sampling, batch | logging, jaeger, otlp |
| Metrics  | otlp, prometheus      | batch, transform             | logging, prometheusremotewrite |
| Logs     | otlp, filelog         | batch                        | logging, loki                  |

## Verification

```bash
# Verify collector is healthy
curl http://localhost:13133/health

# Fetch collector self-metrics
curl http://localhost:8888/metrics

# Send a test trace
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans": []}'
```

## References

- Config: `otel-collector.yml`
- Pipelines: `otel-pipelines.yml`
