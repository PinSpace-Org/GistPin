# Service Level Indicators (SLIs)

An SLI is a quantitative measure of some aspect of the service level. GistPin
standardizes SLI measurement so every service exposes consistent, comparable
indicators that map cleanly onto SLOs and error budgets.

## Standard indicator types

| Type           | Definition                                            | Unit          |
| -------------- | ----------------------------------------------------- | ------------- |
| `availability` | Good requests ÷ total requests                        | ratio (0–1)   |
| `latency`      | A latency quantile (usually p95/p99)                  | seconds       |
| `freshness`    | Fraction of data refreshed within its SLA             | ratio (0–1)   |

## Naming convention

Every SLI is recorded as a Prometheus series named:

```
sli:<service>:<indicator>
```

e.g. `sli:backend_api:availability`, `sli:database:availability`. This uniform
naming lets dashboards and alerts reference SLIs generically across services.

## Catalogue

`infrastructure/monitoring/sli-collection.yml` is the source of truth. Current
SLIs and their SLO targets:

| Service      | Indicator      | SLO target |
| ------------ | -------------- | ---------- |
| backend-api  | availability   | 99.9%      |
| backend-api  | latency_p95    | < 500 ms   |
| analytics    | availability   | 99.5%      |
| analytics    | freshness      | 99%        |
| database     | availability   | 99.95%     |

## SLI → SLO mapping

Each SLI carries an `slo_target`. The SLO (and its error budget / burn-rate
alerts) is defined in `slo-definitions.yml`; the SLI is the *measurement* that
feeds it. Keeping the SLI target alongside the SLI definition means a dashboard
can show "current SLI vs target" without cross-referencing the SLO file.

## Violation tracking

`sli-collection.yml` includes `SLIBelowTarget` alerts that fire when an
availability SLI sits below its SLO target for 10 minutes. This is distinct from
error-budget burn alerts:

- **SLIBelowTarget** — "we are *currently* below target" (point-in-time health).
- **Burn-rate alerts** (in `slo-definitions.yml`) — "we are consuming the error
  budget too fast" (trend over the SLO window).

## Adding an SLI

1. Add the indicator (with `expr` and `slo_target`) under the service in
   `sli-collection.yml`.
2. Add a matching `record: sli:<service>:<indicator>` rule.
3. Add a panel to `grafana/sli-dashboard.json`.
4. If it should page, add an SLO with burn-rate alerts in `slo-definitions.yml`.

## Dashboard

`infrastructure/monitoring/grafana/sli-dashboard.json` renders each SLI against
its target, plus a 24-hour availability trend across services.
