# Runbook: High CPU

**Severity:** P2 | **Team:** Infrastructure

## Symptoms
- CPU > 80% sustained for 5+ minutes
- Grafana alert: `HighCPUUsage`
- Slow API responses / timeouts

## Diagnosis

```bash
# Identify top CPU consumers
kubectl top pods -n gistpin --sort-by=cpu

# Check recent deployments
kubectl rollout history deployment/gistpin-backend

# Inspect pod logs for hot loops
kubectl logs -n gistpin -l app=gistpin-backend --tail=100
```

## Resolution

1. **Scale out** if load-driven:
   ```bash
   kubectl scale deployment/gistpin-backend --replicas=5
   ```
2. **Rollback** if caused by a bad deploy:
   ```bash
   kubectl rollout undo deployment/gistpin-backend
   ```
3. **Kill runaway pod** if isolated:
   ```bash
   kubectl delete pod <pod-name> -n gistpin
   ```

## Escalation
If unresolved after 15 min → page on-call engineer via PagerDuty.

## Post-Mortem
File a post-mortem within 48 hours using the template in `incident-response.md`.
