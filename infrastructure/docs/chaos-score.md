# Chaos Resilience Scoring

This document describes the chaos score tracking system used to measure and improve infrastructure resilience at GistPin.

## Overview

The chaos scoring system assigns a resilience score (0–100) to each service based on the results of automated chaos experiments. Scores are tracked over time to measure improvement and identify regression.

## Score Calculation

Each service is tested against four experiment types:

| Experiment | What It Tests |
|------------|---------------|
| `pod-failure` | Service survives unexpected pod termination |
| `network-latency` | Service degrades gracefully under network delay |
| `resource-exhaustion` | Service handles CPU/memory pressure |
| `failover` | Service recovers from primary node failure |

### Per-Experiment Score

- **Pass + fast recovery** (< 30s): 100 points
- **Pass + slow recovery** (> 300s): 50 points
- **Fail**: 0 points

### Overall Service Score

Average of all experiment scores for the service.

### Overall System Score

Average of all service scores.

### Score Thresholds

| Range | Status | Action |
|-------|--------|--------|
| 90–100 | Excellent | Maintain current practices |
| 70–89 | Good | Minor improvements recommended |
| 40–69 | Warning | Review failed experiments, prioritize fixes |
| 0–39 | Critical | Immediate attention — reliability at risk |

## Usage

### Calculate Scores

```bash
./scripts/chaos-score.sh --calculate
```

Reads experiment results from `${CHAOS_RESULTS_DIR}` and writes the overall score to history.

### View History

```bash
./scripts/chaos-score.sh --history
./scripts/chaos-score.sh --trend 20
```

### Generate Report

```bash
./scripts/chaos-score.sh --report
```

Generates a markdown report with per-service scores, failed experiments, and recommendations.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CHAOS_RESULTS_DIR` | `/tmp/chaos-results` | Directory with experiment result JSON files |
| `SCORE_HISTORY_FILE` | `/tmp/chaos-score-history.json` | Append-only score history |
| `CHAOS_EXPERIMENTS` | `pod-failure network-latency resource-exhaustion failover` | Experiment types |
| `SLACK_WEBHOOK` | _(none)_ | Slack webhook for score alerts |
| `SCORE_CRITICAL` | `40` | Score below which critical alerts fire |
| `SCORE_WARNING` | `70` | Score below which warning alerts fire |

## Result File Format

Each experiment writes a JSON result to `${CHAOS_RESULTS_DIR}/${service}/${experiment}.json`:

```json
{
  "service": "api-gateway",
  "experiment": "pod-failure",
  "passed": true,
  "recovery_time_seconds": 12,
  "timestamp": "2026-07-28T06:00:00Z",
  "details": "Pod recovered in 12s after SIGTERM"
}
```

## Automation

### Run Experiments Weekly

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: chaos-scoring
  namespace: gistpin-chaos
spec:
  schedule: "0 3 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: chaos-score
            image: gistpin/chaos-score:latest
            command: ["/scripts/chaos-score.sh", "--calculate"]
          restartPolicy: OnFailure
```

### Grafana Dashboard

The `resilience-dashboard.json` provides visual tracking of:
- Overall resilience score (current)
- Per-service breakdown
- Score trend over time
- Experiment pass rates
- Mean recovery times

## Improving Scores

When a service scores below the warning threshold:

1. Check which experiments failed (`chaos-score.sh --report`)
2. Review the specific failure mode in experiment logs
3. Implement mitigation (e.g., add PodDisruptionBudget, increase readiness probe timeout)
4. Re-run the failed experiment to verify the fix
5. Monitor score trend for improvement

## Integration with CI/CD

Chaos scores can be used as deployment gates:

```bash
score=$(jq -r '.[-1].overall_score' /tmp/chaos-score-history.json)
if (( $(echo "${score} < ${SCORE_WARNING}" | bc -l) )); then
  echo "Chaos score ${score} below threshold — blocking deployment"
  exit 1
fi
```
