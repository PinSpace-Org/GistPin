# GistPin Runbooks

## Table of Contents

- [Deployment Runbook](#deployment-runbook)
- [Database Maintenance Runbook](#database-maintenance-runbook)
- [Incident Response Runbook](#incident-response-runbook)
- [Secrets Rotation Runbook](#secrets-rotation-runbook)
- [Backup and Restore Runbook](#backup-and-restore-runbook)
- [Scaling Runbook](#scaling-runbook)
- [Disaster Recovery Runbook](#disaster-recovery-runbook)

---

## Deployment Runbook

### Pre-Deployment Checklist

```checklist
- [ ] All tests passing (`npm run test`)
- [ ] All lint checks passing (`npm run lint`)
- [ ] Environment variables configured
- [ ] Database migrations generated and applied
- [ ] Container images built and pushed to registry
- [ ] Release notes updated
- [ ] on-call engineer notified of planned deployment window
```

### Standard Deployment Flow

#### 1. Build and Push Images

```bash
# Set variables
export IMAGE_TAG=sha-$(git rev-parse HEAD)
export REGISTRY=123456789.dkr.ecr.us-east-1.amazonaws.com

# Build backend
docker build \
  -t $REGISTRY/gistpin-backend:$IMAGE_TAG \
  -f ./infrastructure/docker/backend.Dockerfile \
  ./Backend

# Build frontend
docker build \
  -t $REGISTRY/gistpin-frontend:$IMAGE_TAG \
  -f ./infrastructure/docker/frontend.Dockerfile \
  ./Frontend

# Push to registry
docker push $REGISTRY/gistpin-backend:$IMAGE_TAG
docker push $REGISTRY/gistpin-frontend:$IMAGE_TAG
```

#### 2. Deploy to Kubernetes

```bash
# Update image tags in values
helm upgrade --install gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin \
  --set backend.image.tag=$IMAGE_TAG \
  --set analytics.image.tag=$IMAGE_TAG \
  --set backend.env.NODE_ENV=production \
  --wait --timeout 5m
```

#### 3. Verify Deployment

```bash
# Wait for rollout
kubectl rollout status deployment/backend -n gistpin --timeout=5m
kubectl rollout status deployment/analytics -n gistpin --timeout=5m

# Check pod health
kubectl get pods -n gistpin
kubectl describe pod <backend-pod> -n gistpin

# Verify logs are clean
kubectl logs -l app=backend -n gistpin --tail=100 | grep -i error

# Verify endpoints
kubectl port-forward svc/backend 3000:3000 -n gistpin &
curl -f http://localhost:3000/health
pkill -f "kubectl port-forward"
```

#### 4. Post-Deployment Verification

```bash
# Verify database connectivity from backend
kubectl exec -n gistpin deploy/backend -- curl -f localhost:3000/health/db

# Verify blockchain connectivity
kubectl exec -n gistpin deploy/backend -- curl -f localhost:3000/health/blockchain

# Verify metrics collection
curl -s http://localhost:3000/metrics | grep gistpin

# Quick smoke test
curl -X POST http://localhost:3000/api/v1/pins \
  -H "Content-Type: application/json" \
  -d '{"name": "test-pin", "coordinates": {"lat": 0, "lon": 0}}' \
  -b "session_cookie"
```

### Rollback Procedure

```bash
# Find previous release
helm history gistpin -n gistpin

# Rollback to specific revision
helm rollback gistpin <revision-number> -n gistpin

# Verify rollback
kubectl rollout status deployment/backend -n gistpin --timeout=5m
kubectl rollout status deployment/analytics -n gistpin --timeout=5m

# If rollback fails, force rollout
kubectl rollout restart deployment/backend -n gistpin
kubectl rollout restart deployment/analytics -n gistpin
```

---

## Database Maintenance Runbook

### Routine Maintenance

#### Weekly Index Maintenance

```sql
-- Rebuild bloated indexes
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
FROM pg_stat_user_indexes
WHERE schemaname = 'public';

-- Reindex if needed
REINDEX INDEX CONCURRENTLY pins_location_idx;
```

#### Monthly Vacuum Analysis

```sql
-- Check table bloat
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Vacuum analyze all tables
VACUUM FULL ANALYZE;
```

### Connection Pool Management

```sql
-- Check active connections
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'idle') as idle,
       count(*) FILTER (WHERE state = 'active') as active
FROM pg_stat_activity;

-- Terminate long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '30 minutes'
  AND pid <> pg_backend_pid();
```

### Database Migration Procedure

```bash
# 1. Take pre-migration backup
pg_dump -h $DB_HOST -U $DB_USER gistpin > backup-pre-migration-$(date +%Y%m%d).sql

# 2. Apply migrations in transaction
cd Backend
npm run migration:run

# 3. Verify schema
psql -h $DB_HOST -U $DB_USER gistpin -c "
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' ORDER BY table_name;
"

# 4. Run post-migration tests
npm run test:e2e -- --grep "database"

# 5. If failure, rollback
export PGPASSWORD=$DB_PASSWORD
psql -h $DB_HOST -U $DB_USER gistpin < backup-pre-migration-$(date +%Y%m%d).sql
```

---

## Incident Response Runbook

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 - Critical | Complete outage, data loss | 15 minutes | API unreachable, database down |
| P2 - High | Major feature broken | 1 hour | Wallet connection fails |
| P3 - Medium | Minor feature degradation | 4 hours | Slow geo queries |
| P4 - Low | Cosmetic, non-blocking | Next business day | UI alignment bug |

### Incident Response Procedure

#### Step 1: Assess Impact (5 minutes)

```bash
# Check service health
curl -f http://localhost:3000/health || echo "Service down"

# Check recent deployments
helm list -A --filter gistpin
kubectl rollout history deployment/backend -n gistpin

# Check error rate in logs
kubectl logs -l app=backend -n gistpin --since=1h | grep -c "ERROR"
```

#### Step 2: Containment

```bash
# If recent deployment caused issue, rollback
helm rollback gistpin <revision> -n gistpin

# Block problematic requests if applicable
kubectl exec -n gistpin deploy/backend -- curl -X POST \
  http://localhost:3000/api/v1/admin/rate-limit \
  -d '{"endpoint": "/api/v1/blockchain", "limit": 0}'
```

#### Step 3: Investigation

```bash
# Collect diagnostic data
kubectl get pods -n gistpin -o wide > /tmp/pods.txt
kubectl logs -l app=backend -n gistpin --since=2h > /tmp/backend-logs.txt
kubectl logs -l app=postgres -n gistpin --since=2h > /tmp/postgres-logs.txt

# Capture error traces
curl -s http://localhost:16686/api/traces?service=gistpin-backend&lookback=1h \
  > /tmp/traces.json

# Database diagnostic
psql -h $DB_HOST -U $DB_USER gistpin -c "
  SELECT * FROM pg_stat_activity WHERE state = 'active';
"
```

#### Step 4: Resolution

- Apply fix (code hotfix, config change, rollback)
- Verify resolution
- Update stakeholders

#### Step 5: Post-Incident

```bash
# Document incident
cat > /tmp/incident-report.md << EOF
## Incident: [Title]
- **Severity**: P1
- **Start**: $(date -Iseconds)
- **End**: $(date -Iseconds)
- **Impact**: [Description]
- **Root Cause**: [Description]
- **Resolution**: [Description]
- **Preventive Actions**: [List]
EOF

# Create follow-up issue
gh issue create --title "postmortem: [incident title]" --body-file /tmp/incident-report.md
```

---

## Secrets Rotation Runbook

### Prerequisites

- Access to secrets manager (AWS Secrets Manager, HashiCorp Vault)
- External Secrets Operator running in cluster
- Maintenance window or ability to perform rolling restarts

### Rotation Procedure

#### 1. Generate New Secret

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name gistpin/backend/database-password \
  --secret-string "$(openssl rand -base64 32)"

# HashiCorp Vault
vault kv put secret/gistpin/backend/database-password \
  value=$(openssl rand -base64 32)
```

#### 2. Update Application (Zero-Downtime)

```bash
# Update external secret - operator syncs automatically
# For AWS Secrets Manager, External Secrets polls every hour
# Force sync if needed:
kubectl annotate externalsecret backend-secrets \
  force-sync=$(date +%s) \
  -n gistpin

# Watch sync status
kubectl describe externalsecret backend-secrets -n gistpin
```

#### 3. Rolling Restart (if needed)

```bash
# Restart all backend pods to pick up new secret
kubectl rollout restart deployment/backend -n gistpin

# Wait for completion
kubectl rollout status deployment/backend -n gistpin --timeout=10m
```

#### 4. Verification

```bash
# Verify new password is in use
kubectl exec -n gistpin deploy/backend -- \
  env | grep DATABASE_URL

# Verify database connections work
kubectl exec -n gistpin deploy/backend -- \
  curl -f localhost:3000/health/db
```

#### 5. Revoke Old Secret

```bash
# After confirming all pods use new secret (wait 5 minutes)
# AWS - schedule deletion
aws secretsmanager schedule-secret-deletion \
  --secret-id gistpin/backend/database-password-old \
  --recovery-window-in-days 30

# Delete old secret from Vault
vault kv delete secret/gistpin/backend/database-password-old
```

---

## Backup and Restore Runbook

### Automated Backups

Database backups run automatically via Kubernetes CronJob:

```yaml
# infrastructure/k8s/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: gistpin
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:16-alpine
              command:
                - /bin/sh
                - -c
                - |
                  pg_dump -h postgres -U $POSTGRES_USER gistpin \
                    | gzip > /backups/gistpin-$(date +%Y%m%d).sql.gz
                  aws s3 cp /backups/gistpin-*.sql.gz s3://gistpin-backups/
              env:
                - name: POSTGRES_USER
                  valueFrom:
                    secretKeyRef:
                      name: database-credentials
                      key: username
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          restartPolicy: OnFailure
```

### Manual Backup

```bash
# Full database backup
pg_dump -h $DB_HOST -U $DB_USER gistpin > gistpin-backup-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup
pg_dump -h $DB_HOST -U $DB_USER gistpin | gzip > gistpin-backup-$(date +%Y%m%d).sql.gz

# Specific tables only
pg_dump -h $DB_HOST -U $DB_USER gistpin -t pins -t users > partial-backup.sql

# To S3
pg_dump -h $DB_HOST -U $DB_USER gistpin | gzip | \
  aws s3 cp - s3://gistpin-backups/gistpin-$(date +%Y%m%d).sql.gz
```

### Restore Procedure

```bash
# 1. Stop application (maintenance mode)
kubectl scale deployment backend --replicas=0 -n gistpin

# 2. Restore database
gunzip -c gistpin-backup-20240115.sql.gz | \
  psql -h $DB_HOST -U $DB_USER gistpin

# 3. Run migrations if needed
cd Backend
npm run migration:run

# 4. Restart application
kubectl scale deployment backend --replicas=3 -n gistpin
kubectl scale deployment analytics --replicas=2 -n gistpin

# 5. Verify health
sleep 30
kubectl exec -n gistpin deploy/backend -- curl -f localhost:3000/health
```

### Point-in-Time Recovery

```bash
# Restore to specific timestamp using WAL archives
pg_rewind --target-timeline=2 \
  --target-time="2024-01-15 14:30:00" \
  -D /var/lib/postgresql/data \
  --source-server="host=$DB_HOST port=5432 user=$DB_USER dbname=gistpin"

# Restart PostgreSQL
pg_ctl restart -D /var/lib/postgresql/data
```

---

## Scaling Runbook

### Horizontal Scaling

#### Add Backend Replicas

```bash
# Via Helm
helm upgrade gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin \
  --set backend.replicaCount=5 \
  --reuse-values

# Or directly via kubectl
kubectl scale deployment backend --replicas=5 -n gistpin

# Verify
kubectl rollout status deployment/backend -n gistpin
kubectl get hpa backend-hpa -n gistpin
```

#### HPA Configuration

```yaml
# Current configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Vertical Scaling

```bash
# Increase resource limits
helm upgrade gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin \
  --set backend.resources.limits.cpu=1000m \
  --set backend.resources.limits.memory=1Gi \
  --set backend.resources.requests.cpu=500m \
  --set backend.resources.requests.memory=512Mi \
  --reuse-values
```

### Database Scaling

```bash
# Read replica (AWS RDS)
aws rds create-db-instance-read-replica \
  --db-instance-identifier gistpin-db-replica \
  --source-db-instance-identifier gistpin-db-primary

# Update application to use reader endpoint
helm upgrade gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin \
  --set backend.env.DATABASE_READ_URL=$REPLICA_ENDPOINT \
  --reuse-values
```

---

## Disaster Recovery Runbook

### Recovery Time Objectives (RTO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Single pod failure | 30s | 0s |
| Node failure | 2 minutes | 0s |
| AZ failure | 15 minutes | 5 minutes |
| Region failure | 4 hours | 1 hour |
| Data center failure | 4 hours | 1 hour |

### Region Failover Procedure

#### 1. Assess Situation

```bash
# Confirm primary region is down
kubectl config use-context us-east-1
kubectl get pods -n gistpin

# Check traffic routing
aws route53 list-health-checks --query 'HealthChecks[?HealthCheckConfig.FullyQualifiedDomainName==`api.gistpin.io`]'
```

#### 2. Activate Secondary Region

```bash
# Switch to secondary cluster context
kubectl config use-context eu-west-1

# Update external secrets to point to secondary
aws secretsmanager get-secret-value \
  --secret-id gistpin/backend/database-url \
  --region eu-west-1

# Deploy to secondary region
helm upgrade --install gistpin ./infrastructure/k8s/helm/gistpin \
  --namespace gistpin \
  --set backend.env.NODE_ENV=production \
  --set backend.affinity.zone=eu-west-1 \
  -f values.eu-west-1.yaml
```

#### 3. Update DNS

```bash
# Update Route53 health check and routing policy
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1EXAMPLE \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.gistpin.io",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2EXAMPLE",
          "DNSName": "eu-west-1-alb.amazonaws.com",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

#### 4. Verify Active Cluster

```bash
# Verify pods are running
kubectl get pods -n gistpin

# Verify services are healthy
kubectl get endpoints -n gistpin

# Verify database connectivity
kubectl exec -n gistpin deploy/backend -- curl -f localhost:3000/health/db
```

### Complete Site Recovery

```bash
# 1. Provision new infrastructure
cd infrastructure/terraform
terraform plan -var="environment=recovery"
terraform apply -var="environment=recovery"

# 2. Restore from latest backup
$(date -Iminutes)

# 3. Deploy application
helm upgrade --install gistpin ../k8s/helm/gistpin \
  --namespace gistpin \
  --set environment=recovery

# 4. Verify full stack
npm run test:e2e -- --env=recovery

# 5. Update DNS once verified
# (Same as region failover, step 3)
```

### Checklist for DR Test

```
- [ ] Backup restore procedure tested
- [ ] Database failover tested
- [ ] Application deploys to secondary environment
- [ ] DNS failover completes within RTO
- [ ] Data integrity verified after restore
- [ ] Team runbooks reviewed and updated
- [ ] Third-party service failover tested (IPFS, RPC node)
```

---

## Quick Reference

### Emergency Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | PagerDuty / OpsGenie |
| Database Admin | #gistpin-dba |
| Platform Team | #gistpin-platform |
| Blockchain Team | #gistpin-chain |
| Security Team | #gistpin-security |

### Useful kubectl Cheatsheet

```bash
# Get all resources
kubectl get all -n gistpin

# Describe failing resource
kubectl describe <resource> <name> -n gistpin

# Stream logs
kubectl logs -f deploy/backend -n gistpin

# Execute command in pod
kubectl exec -it <pod-name> -n gistpin -- /bin/sh

# Port forward service
kubectl port-forward svc/backend 3000:3000 -n gistpin

# Scale deployment
kubectl scale deployment backend --replicas=N -n gistpin

# Restart deployment
kubectl rollout restart deployment/backend -n gistpin

# Check events
kubectl get events -n gistpin --sort-by='.lastTimestamp'
```
