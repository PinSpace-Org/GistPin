# Runbook: Database Down

**Severity:** P1 | **Team:** Infrastructure + Backend

## Symptoms
- `gistpin_db_up` Prometheus metric = 0
- Backend returning 500 errors on all write endpoints
- Alert: `DatabaseDown`

## Diagnosis

```bash
# Check pod status
kubectl get pods -n gistpin -l app=postgres

# Check logs
kubectl logs -n gistpin -l app=postgres --tail=50

# Test connectivity from backend pod
kubectl exec -n gistpin deploy/gistpin-backend -- \
  pg_isready -h postgres-service -p 5432
```

## Resolution

1. **Restart StatefulSet** (if pod is crashlooping):
   ```bash
   kubectl rollout restart statefulset/postgres -n gistpin
   kubectl rollout status statefulset/postgres --timeout=120s
   ```
2. **Check PVC** (if storage issue):
   ```bash
   kubectl get pvc -n gistpin
   kubectl describe pvc postgres-data -n gistpin
   ```
3. **Restore from backup** (last resort):
   ```bash
   ./infrastructure/scripts/restore-backup.sh latest gistpin_prod
   ```

## Escalation
Immediate page to on-call DBA if not resolved within 5 minutes.

## Post-Mortem
Required for all P1 incidents. Use template in `incident-response.md`.
