# Kubernetes Cluster Cost Attribution by Team

This document describes how GistPin attributes Kubernetes resource costs to teams
using **namespace labels**, produces a monthly **showback report**, and enforces
per-team **budget alerts**.

## 1. Label Strategy

Every workload namespace must carry a `team` label identifying the owning team.
The attribution tooling reads this label during aggregation.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: gistpin-backend
  labels:
    team: backend        # owning team
```

| Label | Value | Purpose |
|-------|-------|---------|
| `team` | `frontend`, `backend`, `data`, `platform`, ... | Owner used for aggregation and showback |

Namespaces without a `team` label are skipped and reported as **unattributed**.
If a different label should drive attribution (e.g. `owner`), pass `--team-label`.

## 2. How the Report Is Generated

The `team-cost-attribution.sh` script performs the following steps:

1. Lists namespaces that carry the `team` label (`kubectl get namespaces`).
2. For each namespace, collects live CPU/memory usage via `kubectl top pods`.
3. Converts raw usage into a cost using a per-resource cost template
   (`infrastructure/scripts/cost-template.json` — `cpu_per_core_hour` /
   `mem_per_gib_hour`, and the per-team `budget` map).
4. Aggregates per-team totals and prints a showback table.

```bash
# Text report (default)
./infrastructure/scripts/team-cost-attribution.sh

# JSON showback report for downstream tooling
./infrastructure/scripts/team-cost-attribution.sh --report

# Aggregate only one namespace
./infrastructure/scripts/team-cost-attribution.sh --namespace gistpin-prod

# Use a different team label
./infrastructure/scripts/team-cost-attribution.sh --team-label owner
```

Example output:

```
TEAM         NAMESPACE            CPU(CORE)    MEM(GiB)     COST(USD/h)  BUDGET         THRESHOLD
backend      gistpin-backend      2.5000       4.0000       0.0940       1200           OK
data         gistpin-data         8.0000       16.0000      0.3158       1500           OK
frontend     gistpin-web          1.2500       2.0000       0.0469       500            OK
```

Reports are written to `infrastructure/ci/reports/team-cost-attribution-*.json`
and are consumed by CI, the Grafana dashboard, and the budget alert rules.

## 3. Cost Template

Costs are derived from the template at
`infrastructure/scripts/cost-template.json`:

```json
{
  "cpu_per_core_hour": 0.0301,
  "mem_per_gib_hour": 0.0047,
  "budget": {
    "frontend": 500,
    "backend": 1200,
    "data": 1500,
    "platform": 800
  }
}
```

Monthly cost is approximated as `hourly_cost * 730`. Adjust the unit prices to
match the actual node/compute pricing of the environment.

## 4. Budget Alerts

Each team may define a monthly budget in the cost template. The attribution
script classifies each team against its budget:

| Threshold | Condition (projected monthly) | Action |
|-----------|-------------------------------|--------|
| `OK` | < 85% of budget | Monitor |
| `WARNING` | 85–100% of budget | Review spend, tune rightsizing |
| `CRITICAL` | ≥ 100% of budget | Immediate spend review, restrict resources |

The Grafana dashboard `monitoring/grafana/team-costs.json` exposes a `$team`
variable and budget-vs-actual panels, and the `$__all` option shows all teams.
Prometheus alerting mirrors `monitoring/budget-alerts.yml` at the cluster level;
team-specific alerts can be added by scoping the expression on the `team` label.

## 5. Monthly Cost Allocation Report

Run the attribution at the end of each month to generate the official showback
figures:

```bash
./infrastructure/scripts/team-cost-attribution.sh --report
```

The JSON report is retained in `infrastructure/ci/reports/` and may be uploaded
to Slack, a billing system, or the finance team. A monthly cron/scheduled CI
job can be wired to the `team-cost-attribution.sh` invocation, e.g. on the 1st
of each month.

## 6. Adding a Team

1. Label the relevant namespaces: `kubectl label namespace <ns> team=<team>`.
2. Add the team's monthly budget to `cost-template.json`.
3. Re-run the attribution script and confirm the team appears in the showback.
