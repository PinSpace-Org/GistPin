# High Log Volume

## Symptom
Log ingestion rate has exceeded 1000 logs/sec for at least 5 minutes.

## Checks
1. Identify which components or services are generating the most logs.
2. Check for log loops, excessive retries, or verbose debug logging left on.
3. Verify that no log amplification is caused by a misconfigured exporter.

## Mitigation
- Temporarily reduce log verbosity for noisy components.
- Investigate and fix the root cause of excessive logging.
- Consider adjusting log sampling or rate limits.
