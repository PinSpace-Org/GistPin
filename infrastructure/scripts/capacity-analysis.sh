#!/usr/bin/env bash
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
LOOKBACK_DAYS="${LOOKBACK_DAYS:-30}"
REPORT_FILE="/tmp/capacity-analysis-$(date +%Y%m%d).txt"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "${REPORT_FILE}"; }

START_TIME=$(date -u -d "${LOOKBACK_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v-"${LOOKBACK_DAYS}"d +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

log "=== GistPin Capacity Analysis ==="
log "Region: ${AWS_REGION} | Period: last ${LOOKBACK_DAYS} days"

# EKS node CPU utilization
log "[1/4] EKS node CPU utilization (avg over ${LOOKBACK_DAYS}d)"
aws cloudwatch get-metric-statistics \
  --region "${AWS_REGION}" \
  --namespace ContainerInsights \
  --metric-name node_cpu_utilization \
  --dimensions Name=ClusterName,Value=gistpin \
  --statistics Average Maximum \
  --period 86400 \
  --start-time "${START_TIME}" \
  --end-time "${END_TIME}" \
  --query 'sort_by(Datapoints, &Timestamp)[].[Timestamp,Average,Maximum]' \
  --output table | tee -a "${REPORT_FILE}" || log "CloudWatch data unavailable"

# EKS node memory utilization
log "[2/4] EKS node memory utilization"
aws cloudwatch get-metric-statistics \
  --region "${AWS_REGION}" \
  --namespace ContainerInsights \
  --metric-name node_memory_utilization \
  --dimensions Name=ClusterName,Value=gistpin \
  --statistics Average Maximum \
  --period 86400 \
  --start-time "${START_TIME}" \
  --end-time "${END_TIME}" \
  --query 'sort_by(Datapoints, &Timestamp)[].[Timestamp,Average,Maximum]' \
  --output table | tee -a "${REPORT_FILE}" || log "CloudWatch data unavailable"

# RDS storage and connections
log "[3/4] RDS storage and connection trends"
for METRIC in FreeStorageSpace DatabaseConnections; do
  log "  Metric: ${METRIC}"
  aws cloudwatch get-metric-statistics \
    --region "${AWS_REGION}" \
    --namespace AWS/RDS \
    --metric-name "${METRIC}" \
    --dimensions Name=DBInstanceIdentifier,Value=gistpin-db \
    --statistics Average Maximum \
    --period 86400 \
    --start-time "${START_TIME}" \
    --end-time "${END_TIME}" \
    --query 'sort_by(Datapoints, &Timestamp)[].[Timestamp,Average,Maximum]' \
    --output table | tee -a "${REPORT_FILE}" || true
done

# Current HPA status
log "[4/4] Current HPA scaling status"
kubectl get hpa -n gistpin 2>/dev/null | tee -a "${REPORT_FILE}" \
  || log "kubectl not available, skipping HPA status"

log ""
log "Analysis complete. Report: ${REPORT_FILE}"
log "Run forecast-usage.py for growth projections."
