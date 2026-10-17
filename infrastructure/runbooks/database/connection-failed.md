# Database Connection Failed

## Symptom
Multiple database connection failures detected in 5 minutes (more than 5).

## Checks
1. Verify the database is running and accepting connections.
2. Check database connection pool settings and max connections.
3. Review database resource usage (CPU, memory, disk).
4. Check network connectivity between the backend and database.

## Mitigation
- If the database is down, restart it or failover to a replica.
- If connection pool exhaustion, increase pool size or reduce connection lifetime.
- If network issue, check security groups, DNS, and firewall rules.
