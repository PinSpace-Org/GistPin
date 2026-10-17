# Log Volume Anomaly

## Symptom
Current log rate is 3x higher than the same time yesterday.

## Checks
1. Compare current log volume against the historical baseline.
2. Identify which services or components are contributing to the increase.
3. Check for scheduled jobs or traffic spikes that could explain the increase.

## Mitigation
- If caused by a known event (deployment, traffic spike), monitor until it subsides.
- If unexplained, investigate recent changes and potential issues.
