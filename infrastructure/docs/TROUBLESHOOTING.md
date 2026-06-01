# GistPin Troubleshooting Guide

## Quick Diagnostic Commands

```bash
# Check service status (Docker Compose)
docker compose ps
docker compose logs backend
docker compose logs postgres

# Check service status (Kubernetes)
kubectl get pods -n gistpin
kubectl describe pod <pod-name> -n gistpin
kubectl logs <pod-name> -n gistpin --tail=100

# Database connectivity
pg_isready -h localhost -p 5432 -U gistpin

# Network connectivity
curl -v http://localhost:3000/health
curl -v http://localhost:3000/metrics
```

## Table of Contents

- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [Blockchain Issues](#blockchain-issues)
- [Observability Issues](#observability-issues)
- [Kubernetes Issues](#kubernetes-issues)
- [Performance Issues](#performance-issues)

## Backend Issues

### Issue: Application won't start - `DATABASE_URL` connection refused

**Symptoms:**
```
ERROR [TypeOrmModule] Unable to connect to the database.
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Diagnosis:**
```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Check connection string format
# Correct: postgresql://user:pass@host:5432/db
# Wrong: postgres://user:pass@host:5432/db (missing 'ql')
```

**Resolution:**
```bash
# Start PostgreSQL
docker compose up postgres -d

# Wait for healthy status
docker compose ps postgres

# Verify connection
psql postgresql://gistpin:gistpin@localhost:5432/gistpin -c "SELECT 1"
```

### Issue: Migration fails with "relation already exists"

**Symptoms:**
```
QueryFailedError: relation "users" already exists
```

**Resolution:**
```bash
# Check migration status
cd Backend
npm run migration:show

# If migrations are out of sync, reset (WARNING: data loss)
npm run migration:revert -- -n 10  # revert 10 migrations
# OR: Drop and recreate database
npm run migration:run
```

### Issue: CORS errors in development

**Symptoms:**
```
Access to fetch at 'http://localhost:3000' blocked by CORS policy
```

**Resolution:**
In `Backend/src/main.ts`, verify CORS configuration:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
});
```

## Frontend Issues

### Issue: "Next.js build failed" - Missing environment variables

**Symptoms:**
```
Error: NEXT_PUBLIC_API_URL is not defined
```

**Resolution:**
```bash
# Verify .env.local exists
cat Frontend/.env.local

# Rebuild
cd Frontend
rm -rf .next
npm run build
```

### Issue: Map tiles not loading

**Symptoms:**
- Map renders but tiles appear broken
- Console errors about tile URLs

**Diagnosis:**
```bash
# Check if Leaflet CSS is imported
grep -r "leaflet/dist/leaflet.css" Frontend/src/
```

**Resolution:**
Add to `layout.tsx` or `globals.css`:
```typescript
import 'leaflet/dist/leaflet.css';
```

### Issue: Wallet connection fails

**Symptoms:**
- "Wallet not found" or "Network mismatch" errors

**Resolution:**
- Verify `NEXT_PUBLIC_SOROBAN_RPC_URL` matches wallet network
- Clear browser localStorage: `localStorage.clear()`
- Check Freighter extension is connected to correct network

## Database Issues

### Issue: Slow geo-spatial queries

**Symptoms:**
- Pin searches take > 2 seconds
- EXPLAIN shows sequential scans

**Resolution:**
```sql
-- Verify PostGIS extension is enabled
SELECT PostGIS_Version();

-- Verify spatial indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'pins';

-- Create spatial index if missing
CREATE INDEX pins_location_idx ON pins USING GIST (location);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM pins 
WHERE ST_DWithin(
  location, 
  ST_MakePoint(-73.97, 40.77)::geography, 
  5000
);
```

### Issue: "too many connections" error

**Symptoms:**
```
ERROR: sorry, too many clients already
```

**Resolution:**
```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND pid <> pg_backend_pid();
```

**Long-term fix:**
- Enable connection pooling (PgBouncer)
- Increase `max_connections` in PostgreSQL config
- Close connections properly in application code

### Issue: Data corruption after crash

**Symptoms:**
- `PANIC: could not locate a valid checkpoint record`
- Database won't start

**Resolution:**
```bash
# Check for WAL corruption
pg_resetwal -f /var/lib/postgresql/data

# Restore from backup
pg_restore -d gistpin backup.dump

# Verify data integrity
cd Backend
npm run test:cov
```

## Blockchain Issues

### Issue: Soroban RPC timeout

**Symptoms:**
```
Error: timeout exceeded
```

**Resolution:**
```bash
# Test RPC connectivity
curl -X POST $SOROBAN_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Increase timeout in code
// BlockchainModule
@Module({
  providers: [
    {
      provide: 'SOROBAN_TIMEOUT',
      useValue: 30000, // 30 seconds
    },
  ],
})
```

### Issue: Transaction simulation fails

**Symptoms:**
```
Simulation failed: Insufficient balance
```

**Resolution:**
- Verify Stellar testnet account has sufficient XLM (fetch from friendbot)
- Check contract exists at specified ID
- Verify network passphrase matches RPC URL

### Issue: Contract invocation returns "error while unwrapping"

**Symptoms:**
Smart contract execution fails silently

**Resolution:**
```javascript
// Enable detailed error logging
const result = await sorobanClient.simulateTransaction(tx);
if (result.result) {
  console.error('Simulation error:', result.result);
} else {
  console.error('RPC error:', result.error);
}
```

## Observability Issues

### Issue: No metrics visible in Prometheus

**Symptoms:**
- `/metrics` endpoint returns 404
- Prometheus shows targets as down

**Resolution:**
```bash
# Verify metrics endpoint is exposed
curl http://localhost:3000/metrics

# Check if prom-client is initialized
grep -r "prom-client" Backend/src/

# In NestJS, ensure PrometheusModule is imported
@Module({
  imports: [
    PrometheusModule.register({
      route: { path: '/metrics', url: '/metrics' },
    }),
  ],
})
```

### Issue: Traces not appearing in Jaeger

**Symptoms:**
- Jaeger UI shows no services
- Backend logs show `JaegerExporter` errors

**Diagnosis:**
```bash
# Verify OTLP endpoint is reachable
curl -v http://localhost:4317

# Check OTel SDK initialization
grep -r "registerInstrumentations" Backend/src/
```

**Resolution:**
```javascript
// Ensure trace exporter is configured
const sdk = new NodeSDK({
  serviceName: 'gistpin-backend',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
});

sdk.start();
```

### Issue: Grafana dashboard not loading data

**Symptoms:**
- Panels show "No data"
- Query returns empty results

**Resolution:**
```bash
# Verify Prometheus data source
curl "http://localhost:9090/api/v1/query?query=up"

# Check metric names match queries
curl http://localhost:3000/metrics | head -50

# Verify time range in dashboard
# Ensure dashboard filter variables are set correctly
```

### Issue: High memory usage in collector

**Symptoms:**
- OTel collector using > 1GB memory
- OOMKilled events in K8s

**Resolution:**
```yaml
# Increase memory limits
resources:
  limits:
    memory: "1Gi"
  requests:
    memory: "512Mi"

# Adjust memory ballast in otel-collector.yml
memory_ballast:
  size_in_percentage: 30
```

## Kubernetes Issues

### Issue: Pods stuck in `CrashLoopBackOff`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n gistpin
kubectl logs <pod-name> -n gistpin --previous
kubectl get events -n gistpin --sort-by='.lastTimestamp'
```

**Common Causes:**
1. **ImagePullBackOff**: Image tag doesn't exist
   ```bash
   kubectl describe pod <pod-name> | grep -A5 "Events"
   ```

2. **ConfigMap/Secret not found**
   ```bash
   kubectl get configmap -n gistpin
   kubectl get secret -n gistpin
   ```

3. **Port already in use**
   ```bash
   kubectl exec <pod-name> -n gistpin -- netstat -tulpn
   ```

### Issue: Ingress not working

**Symptoms:**
- `502 Bad Gateway`
- SSL certificate errors

**Resolution:**
```bash
# Verify ingress controller is running
kubectl get pods -n ingress-nginx

# Check ingress status
kubectl describe ingress gistpin -n gistpin

# Test connectivity
kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8080:80
curl -v http://localhost:8080/
```

### Issue: HPA not scaling

**Symptoms:**
- CPU/memory load high but pods aren't scaling

**Diagnosis:**
```bash
# Check HPA status
kubectl get hpa -n gistpin
kubectl describe hpa backend-hpa -n gistpin

# Verify metrics server is running
kubectl get pods -n metrics-server
```

**Resolution:**
- Ensure metrics-server is installed and healthy
- Check resource requests are set in deployment
- Verify custom metrics are registered if using custom scaling

### Issue: PVC not binding

**Symptoms:**
- PVC stuck in `Pending` state

**Resolution:**
```bash
# Check PV availability
kubectl get pv

# Check storage class
kubectl get storageclass

# If using dynamic provisioning, ensure provisioner exists
kubectl get pods -n kube-system | grep provisioner
```

## Performance Issues

### Issue: API response times > 5000ms

**Diagnosis:**
```bash
# Profile database queries
# Enable query logging in TypeORM
// OrataConfig
{
  logging: true,
  logger: 'advanced-console',
}

# Check slow query log
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state = 'active';
```

**Resolution:**
- Add database indexes on frequently queried columns
- Enable query result caching (Redis)
- Implement cursor-based pagination
- Review N+1 query patterns

### Issue: Memory leak in backend

**Diagnosis:**
```bash
# Take heap snapshot
kill -USR2 <node-pid>

# Monitor memory over time
kubectl top pods -n gistpin --containers

# Check for event listener leaks
grep -r "EventEmitter" Backend/src/ | grep "on(" | wc -l
```

**Common Causes:**
- Unclosed database connections
- Event listeners not removed
- Large response bodies not streamed

### Issue: Frontend hydration mismatch

**Symptoms:**
```
Error: Text content does not match server-rendered HTML
```

**Resolution:**
```typescript
// Use useEffect for client-only code
useEffect(() => {
  // Client-only logic here
}, []);

// Check for browser-only globals
if (typeof window !== 'undefined') {
  // window.* usage here
}

// Ensure consistent data between server and client
```

## Emergency Procedures

### Database Recovery

```bash
# Trigger immediate backup
kubectl exec -n gistpin postgres-0 -- pg_dump -U gistpin gistpin > backup.sql

# Point-in-time recovery
# Restore to specific transaction
pg_restore --recovery-target-time="2024-01-15 10:30:00" backup.dump
```

### Rollback Procedure

```bash
# Kubernetes rollback
helm rollback gistpin -n gistpin

# Database rollback
cd Backend
npm run migration:revert

# Verify rollback
kubectl rollout status deployment/backend -n gistpin
```

### Data Integrity Check

```bash
# Verify all pins have valid geospatial data
psql postgresql://gistpin:gistpin@localhost:5432/gistpin -c "
  SELECT id, location, ST_IsValid(location) 
  FROM pins 
  WHERE ST_IsValid(location) = false;
"

# Verify contract IDs match between DB and blockchain
psql postgresql://gistpin:gistpin@localhost:5432/gistpin -c "
  SELECT contract_id, COUNT(*) 
  FROM gists 
  GROUP BY contract_id;
"
```

## Getting Help

- Check [Setup Guide](./SETUP.md) for configuration issues
- Review [Runbooks](./RUNBOOKS.md) for operational procedures
- Consult [Architecture Doc](./ARCHITECTURE.md) for system design questions
- Open an issue on GitHub with logs and reproduction steps
