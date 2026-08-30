# Grafana ↔ PagerDuty On-Call Integration

Alerts from Grafana page the right person via PagerDuty, and the current on-call
responder is mirrored back into Grafana so dashboards and alert annotations show
who is holding the pager.

## Two directions

| Direction               | Mechanism                                                    |
| ----------------------- | ----------------------------------------------------------- |
| Grafana → PagerDuty     | Provisioned contact points + notification policy route alerts to PagerDuty by severity. |
| PagerDuty → Grafana     | `sync-oncall.sh` publishes the current on-call into a Grafana-readable ConfigMap. |

## Alert routing (Grafana → PagerDuty)

`pagerduty-integration.yaml` provisions:

- **Contact points** — `pagerduty-critical` and `pagerduty-warning`, each with
  its own PagerDuty routing key.
- **Notification policy** — routes by the `severity` label:
  - `severity = critical` → `pagerduty-critical`, `group_wait: 0s` (pages
    immediately), repeat every 30m.
  - `severity = warning` → `pagerduty-warning`, low-urgency, repeat every 4h.

This is the escalation policy mapping: severity determines which PagerDuty
escalation (and therefore which urgency and escalation chain) an alert enters.

## Schedule sync (PagerDuty → Grafana)

`sync-oncall.sh` queries the PagerDuty API for the current on-call user of each
configured schedule and writes a `grafana-current-oncall` ConfigMap:

```json
{ "platform": "Ada Lovelace", "backend": "Alan Turing" }
```

Grafana reads this to annotate alerts and dashboards with the responder's name.
Run it on a short CronJob (every ~5 minutes) so handovers propagate quickly.

## Components

| File                                                  | Purpose                                          |
| ----------------------------------------------------- | ------------------------------------------------ |
| `infrastructure/monitoring/pagerduty-integration.yaml`| Contact points, notification policy, sync config.|
| `infrastructure/scripts/sync-oncall.sh`               | Mirrors PagerDuty on-call into Grafana.          |
| `infrastructure/docs/oncall-integration.md`           | This document.                                   |

## On-call handover automation

Because the sync runs continuously, a scheduled handover in PagerDuty is
reflected in Grafana within one sync interval — no manual step. If a schedule
has a gap, the sync reports `UNASSIGNED`, which is a visible signal to fix the
schedule rather than a silent hole.

## Configuration

| Variable               | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `PAGERDUTY_API_TOKEN`  | PagerDuty REST API token (required).           |
| `SYNC_CONFIG`          | Path to the `oncall-sync.yaml` config.         |
| `DRY_RUN=true`         | Print the on-call map instead of writing it.   |

Routing keys (`PAGERDUTY_CRITICAL_ROUTING_KEY`, `PAGERDUTY_WARNING_ROUTING_KEY`)
are injected into the Grafana contact points from secrets, not committed.
