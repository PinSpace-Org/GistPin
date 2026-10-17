# Authentication Failures

## Symptom
More than 20 authentication failures detected in 10 minutes — possible brute force attempt.

## Checks
1. Review the source IP addresses of failed authentication attempts.
2. Check if a specific user account is being targeted.
3. Verify that authentication services are functioning correctly.

## Mitigation
- If a brute force attack is confirmed, rate-limit or block the offending IPs.
- Temporarily enable stricter rate limiting on authentication endpoints.
- Notify the security team and review access logs.
