
# Cloud Spend Forecasting

This document describes the cost forecasting methodology used by GistPin, covering how projections are generated, the assumptions behind the model, and how budgets are managed.

## 1. Forecasting Methodology

The `cost-forecast.py` script uses **AWS Cost Explorer API** data to build spend projections.

### Data Sources

- **AWS Cost Explorer** — daily unblended cost and usage, grouped by service.
- **AWS Rightsizing Recommendations** — EC2 instance right-sizing suggestions for savings detection.

### Model

A **linear regression** over historical daily costs is used to project future spend. The slope of the regression line represents the average daily cost change, extrapolated over 30-, 60-, and 90-day horizons.

**Formula:**

```
y(t) = α + β · t
```

Where:
- `y(t)` is the projected cost at time `t`
- `α` (intercept) = `ȳ - β · x̄`
- `β` (slope) = Σ((xᵢ - x̄)(yᵢ - ȳ)) / Σ((xᵢ - x̄)²)

## 2. Model Assumptions

| Assumption | Rationale |
|---|---|
| Spend follows a linear trend | Suitable for steady-state workloads; does not account for step changes (new deployments, traffic spikes) |
| Historical data is representative | 90-day lookback captures seasonal patterns |
| Resource counts remain stable | The model does not auto-detect scaling events |
| USD constant dollars | No inflation or pricing changes factored in |

### Limitations

- Linear regression **under-forecasts** during rapid growth phases (e.g. after a product launch).
- **No seasonality** modelling — weekly/monthly patterns are averaged out.
- **No anomaly scrubbing** — one-off charges (e.g. reserved instance purchases) distort the trend.

## 3. Budget Management

### Budget Thresholds

| Level | Threshold | Action |
|---|---|---|
| Info | < 85% of budget | Monitor |
| Warning | 85–100% of budget | Review cost-optimisation.sh output |
| Critical | > 100% of budget | Immediate spend review, restrict non-essential resources |

### Prometheus Alerts

Alerts defined in `budget-alerts.yml` fire when:
- Projected spend exceeds budget
- Forecast growth rate exceeds 20%
- Resource cost growth exceeds 50%
- Rightsizing savings exceed $100/month

### Recommended Cadence

- Run `cost-forecast.py` daily via cron or scheduled CI workflow.
- Review budget-alert dashboard weekly.
- Conduct a full cost review monthly.

## 4. Usage

```bash
# Text output (default)
python3 infrastructure/scripts/cost-forecast.py

# JSON output for downstream processing
python3 infrastructure/scripts/cost-forecast.py --output json

# Custom budget threshold
python3 infrastructure/scripts/cost-forecast.py --budget 10000
```
