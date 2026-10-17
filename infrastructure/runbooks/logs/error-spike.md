# Error Log Spike

## Symptom
Error rate has exceeded 10 errors per minute for at least 2 minutes.

## Checks
1. Review recent error logs to identify common patterns or messages.
2. Check if a recent deployment introduced the errors.
3. Verify database and external service connectivity.

## Mitigation
- If a recent deployment caused the spike, consider rolling back.
- If an external dependency is failing, check its status and retry logic.
- Increase logging verbosity to capture more diagnostic information.
