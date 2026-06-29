# Maintenance Windows

## Overview

Maintenance windows define approved periods for performing cluster operations. PodDisruptionBudgets (PDBs) guard critical services during these windows.

## PDB Implications

| Service | PDB Rule | Impact During Drain |
|---------|----------|-------------------|
| Backend | minAvailable: 2 | Max 1 pod drained at a time |
| Database | maxUnavailable: 0 | No disruption allowed |
| Frontend | minAvailable: 1 | Max 1 pod drained at a time |
| Monitoring | minAvailable: 1 | Max 1 pod drained at a time |

### PDB Constraints
- Draining a node requires evaluating all PDBs
- A drain stalls if any PDB would be violated
- Use `kubectl drain --disable-eviction` to bypass PDBs only in emergencies

## Drain Procedures

### Standard Node Drain

```bash
# Cordo the node to prevent new pods
kubectl cordon <node-name>

# Drain respecting PDBs
kubectl drain <node-name> --ignore-daemonsets

# Verify node is drained
kubectl get pods --all-namespaces --field-selector spec.nodeName=<node-name>
```

### Emergency Drain

```bash
# Bypass PDBs during incident
kubectl drain <node-name> --ignore-daemonsets --disable-eviction --force

# After incident, verify all services recovered
bash infrastructure/scripts/validate-services.sh
```

### Rolling Back a Drain

```bash
kubectl uncordon <node-name>
```

## Scheduling

### Approved Maintenance Windows

| Day | Window (UTC) | Type | Impact |
|-----|-------------|------|--------|
| Tuesday | 02:00-04:00 | Standard drain | Low |
| Thursday | 02:00-04:00 | Standard drain | Low |
| Emergency | As needed | Bypass PDBs | High |

### Pre-Maintenance Checklist

1. Verify PDBs are in place: `kubectl get pdb --all-namespaces`
2. Check service health: `bash infrastructure/scripts/validate-services.sh`
3. Ensure sufficient replicas running: `kubectl get pods --all-namespaces`
4. Notify team via Slack #ops channel
5. Review runbooks for affected services

### Post-Maintenance Verification

1. Validate all pods are running: `kubectl get pods --all-namespaces | grep -v Running`
2. Run smoke tests: `bash infrastructure/scripts/smoke-tests.sh`
3. Check PDB status: `kubectl describe pdb -n gistpin-prod`
4. Validate application health endpoint returns 200

## Emergency Procedures

If a drain is blocked by a PDB:

1. Identify the blocking PDB: `kubectl describe pdb <name> -n <namespace>`
2. Check pod distribution: `kubectl get pods -n <namespace> -o wide`
3. Evaluate if temporary PDB relaxation is needed
4. Only modify PDBs with manager approval
