# Critical Log Error

## Symptom
A critical-level error has been logged by the application.

## Checks
1. Check the application logs for the error message and stack trace.
2. Identify the component that emitted the error.
3. Determine if the error is transient or persistent.

## Mitigation
- If transient, monitor for recurrence.
- If persistent, investigate the root cause and deploy a fix.
- If the error affects availability, initiate a rollback or failover.
