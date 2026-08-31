# Terraform Workspace Activity Monitoring

Terraform runs change production infrastructure, so workspace activity is
monitored for compliance and auditing: who ran what, what failed, and what took
unusually long.

## What is tracked

| Signal                | Why it matters                                          |
| --------------------- | ------------------------------------------------------- |
| Run history + actor   | Audit trail: who initiated each run and its outcome.    |
| Failed runs           | A failed apply may leave infra half-changed — alert.    |
| Long-running plans    | A plan blowing past its SLA signals state bloat or provider trouble. |
| Applies outside hours | Applies outside the change window warrant a second look.|
| Stuck/pending runs    | A run pending for an hour usually means a stuck queue or missing approval. |

## Components

| File                                                    | Purpose                                          |
| ------------------------------------------------------- | ------------------------------------------------ |
| `infrastructure/scripts/monitor-workspace-activity.sh`  | Pulls run history from the TFE API; `--digest` for weekly summary. |
| `infrastructure/monitoring/terraform-activity.yml`      | Prometheus recording rules + activity alerts.    |
| `infrastructure/docs/workspace-activity.md`             | This document.                                   |

## Run history & user activity

```bash
TFE_ORG=gistpin TFE_TOKEN=*** ./infrastructure/scripts/monitor-workspace-activity.sh
```

For each workspace it lists recent runs with timestamp, status, and the actor
who created the run — the core audit record.

## Failed run alerting

The script exits non-zero when any failed runs are found, so a cron/CI wrapper
can alert. In Prometheus, `TerraformRunFailed` fires on any `errored` run within
15 minutes.

## Long-running plan detection

`tfe:plan_duration_seconds:p95` records the p95 plan duration per workspace;
`TerraformPlanSlow` fires when it exceeds 20 minutes. The script independently
flags any individual plan over `PLAN_SLA_MINUTES` (default 20).

## Weekly activity digest

```bash
./infrastructure/scripts/monitor-workspace-activity.sh --digest
```

Produces a summary (workspaces monitored, failed runs, long-running plans) suited
to posting into a team channel for a weekly compliance review.

## Configuration

| Variable           | Default                    | Meaning                          |
| ------------------ | -------------------------- | -------------------------------- |
| `TFE_TOKEN`        | —                          | TFE API token (required).        |
| `TFE_ORG`          | —                          | Organization (required).         |
| `TFE_ADDR`         | `https://app.terraform.io` | TFE host.                        |
| `PLAN_SLA_MINUTES` | `20`                       | Long-running-plan threshold.     |

## Metrics integration

The Prometheus rules assume `tfe_*` metrics are exported (via a small exporter
running the script's queries, or the TFE metrics/webhook integration). Wire the
`terraform-activity.yml` rules into the monitoring stack so the alerts fire
alongside the rest of the platform's alerting.
