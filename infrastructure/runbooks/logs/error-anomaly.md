# Error Rate Anomaly

## Symptom
Current error rate is 5x higher than the same time yesterday.

## Checks
1. Compare current error rate against the historical baseline.
2. Identify which error types are increasing.
3. Check for recent deployments, configuration changes, or dependency issues.

## Mitigation
- If caused by a recent change, consider rolling back.
- If caused by an external dependency, verify its status and implement circuit breakers.
- Escalate to the on-call engineer if the error rate continues to climb.
