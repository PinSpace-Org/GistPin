# Terraform Observability

Distributed tracing for Terraform operations using OpenTelemetry.

## Overview

Terraform operations emit OpenTelemetry traces to the GistPin observability pipeline. Each plan, apply, and destroy operation generates spans for the overall run, individual resource operations, and provider interactions.

## Architecture

```
Terraform CLI → OpenTelemetry Exporter → OTEL Collector → Jaeger / Tempo
                        ↓
               CloudWatch Logs
                        ↓
               CloudWatch Metrics & Alarms
```

## Configuration

Tracing is configured via Terraform variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `tracing_enabled` | `true` | Enable/disable tracing |
| `tracing_endpoint` | `http://otel-collector:4318/v1/traces` | OTEL HTTP endpoint |

## Trace Attributes

Each trace carries the following attributes:

| Attribute | Description |
|-----------|-------------|
| `tf.command` | Terraform command (plan/apply/destroy) |
| `tf.workspace` | Workspace name |
| `tf.module` | Module path |
| `tf.resource_type` | Resource type (e.g. `aws_s3_bucket`) |
| `tf.resource_name` | Resource logical name |

## Alerting

Alerting rules in `infrastructure/monitoring/tf-traces.yml`:

| Alert | Severity | Threshold |
|-------|----------|-----------|
| TfTraceExporterDown | critical | Exporter unreachable > 2m |
| TfTraceExportHighFailureRate | warning | > 10% failure rate |
| TfTraceExportLatencySpike | warning | p95 > 5s |
| TfTraceExportQueueBacklog | warning | Queue > 1000 |
| TfTraceBackendUnavailable | critical | Backend down |
| TfTraceSpanDropped | warning | Spans being dropped |

## Dashboards

A CloudWatch dashboard (`{project}-{env}-tf-tracing`) visualizes trace metrics including export failures, latency, and log events.

## Related Resources

- [Tracing Terraform Configuration](../terraform/tracing.tf)
- [Alerting Rules](../monitoring/tf-traces.yml)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
