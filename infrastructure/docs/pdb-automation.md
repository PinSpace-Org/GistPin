# PodDisruptionBudget Automation

## Overview

GistPin automatically generates PodDisruptionBudgets (PDBs) based on deployment replica counts to ensure high availability during voluntary disruptions.

## How It Works

### Static Generation

The `generate-pdbs.sh` script scans all Deployments in the `gistpin` namespace and generates PDB manifests:

- Single-replica deployments are excluded (no voluntary disruption possible)
- Deployments with existing PDBs are skipped
- `minAvailable` is calculated as `(replicas + 1) / 2`

```bash
# Generate PDBs for all deployments
./infrastructure/scripts/generate-pdbs.sh

# Dry-run mode
DRY_RUN=true ./infrastructure/scripts/generate-pdbs.sh

# Custom minAvailable
./infrastructure/scripts/generate-pdbs.sh --min-available 3
```

### Runtime Monitoring

The `pdb-controller` deployment continuously monitors PDB compliance:

- Runs every 5 minutes
- Logs warnings for deployments without PDBs
- Serves as a safety net for manually-created deployments

## PDB Policy

| Replicas | minAvailable | Rationale                                |
|----------|-------------|------------------------------------------|
| 1        | N/A         | Excluded — no voluntary disruption impact |
| 2        | 1           | At least 1 pod always running            |
| 3        | 2           | Majority availability                    |
| 4        | 2           | Majority availability                    |
| 5        | 3           | Majority availability                    |

## Generated PDB Format

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: <deployment>-pdb
  namespace: gistpin
  labels:
    app: <deployment>
    managed-by: pdb-automation
spec:
  minAvailable: <calculated>
  selector:
    matchLabels:
      app: <deployment>
```

## Exclusions

- Deployments with `replicas: 1` are excluded
- Deployments with label `pdb-automation/exclude: "true"` are excluded
- Existing PDBs are never overwritten

## CI Integration

PDB generation runs as part of the deployment pipeline to ensure all production deployments have proper disruption budgets before traffic is shifted.
