# SIEM Setup Guide

## Overview

Security logs from three sources are forwarded to the SIEM endpoint:

| Source | Mechanism |
|---|---|
| AWS CloudTrail | CloudWatch Logs → Kinesis Firehose → SIEM |
| Kubernetes audit logs | Fluent Bit DaemonSet → Kinesis Firehose → SIEM |
| Application security logs | Fluent Bit (pods labelled `security-log: "true"`) → Firehose |

## Infrastructure

Deployed via `infrastructure/terraform/siem-integration.tf`:
- `aws_kinesis_firehose_delivery_stream.siem` — GZIP-compressed HTTP endpoint delivery
- `aws_s3_bucket.siem_backup` — 365-day retention backup for failed deliveries
- `aws_cloudwatch_log_group.siem_trail` — 90-day CloudTrail log retention

## K8s forwarder

```bash
kubectl apply -f infrastructure/monitoring/siem-forwarder.yaml
kubectl create secret generic siem-config \
  --from-literal=firehose_stream_name=gistpin-prod-siem-stream \
  -n monitoring
```

## Configuring the endpoint

```bash
export TF_VAR_siem_endpoint_url="https://your-siem-endpoint/collector"
terraform apply -target=aws_kinesis_firehose_delivery_stream.siem
```

## Correlation rules

Configure the following in your SIEM:
1. **Brute-force**: >10 failed logins in 5 min from same IP
2. **Privilege escalation**: IAM policy changes followed by new resource creation
3. **Exfiltration**: Unusually large S3 GetObject bursts
