# Database Scaling with Read Replicas

## Overview

GistPin uses PostgreSQL (AWS RDS) with read replicas to distribute read traffic and improve availability.

## Architecture

```
Application
    │
    ├── Writes → Primary RDS (gistpin-{env}-postgres)
    └── Reads  → Read Replica CNAME (db-read.{env}.internal.gistpin)
                     │
                     └── replica-1 (+ replica-2 if replica_count > 1)
```

## Terraform Configuration

Read replicas are managed in `infrastructure/terraform/rds-replicas.tf`.

| Variable | Default | Description |
|---|---|---|
| `replica_count` | `1` | Number of read replicas |
| `replica_instance_class` | `db.t3.medium` | Replica instance type |

Scale replicas via `terraform apply -var="replica_count=2"`.

## Connection Routing

| Traffic type | Endpoint |
|---|---|
| Writes, transactions | Primary: `aws_db_instance.postgres.address` |
| Read queries | CNAME: `db-read.{env}.internal.gistpin` |

Configure in the application via `DATABASE_READ_URL` env var pointing to the read CNAME.

## Monitoring

Replication lag alerts are defined in `infrastructure/monitoring/replication-lag.yml`:

| Alert | Threshold | Severity |
|---|---|---|
| `ReplicaLagWarning` | > 10s for 5m | warning |
| `ReplicaLagCritical` | > 60s for 2m | critical |
| `ReplicaReplicationStopped` | 0 lag + 0 connections | critical |

CloudWatch alarms are also created per replica via Terraform (threshold: 30s).

## Failover

If a replica is unavailable, point `DATABASE_READ_URL` back to the primary:
```bash
# Emergency: route reads to primary
kubectl set env deployment/backend DATABASE_READ_URL="$DATABASE_URL"
```

Replicas can be manually promoted to primary via the AWS Console or:
```bash
aws rds promote-read-replica --db-instance-identifier gistpin-prod-replica-1
```

## Replication Checks

```bash
# Check lag from Prometheus
curl -s http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=aws_rds_replica_lag_average' | jq .

# Check via psql on primary
psql -c "SELECT * FROM pg_stat_replication;"
```
