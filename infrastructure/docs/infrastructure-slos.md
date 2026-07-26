# Infrastructure SLOs and Runbooks

## Defined SLO Targets
- **Database Availability**: 99.9% uptime over a 30-day window.
- **K8s Control Plane**: 99.95% API server availability.
- **Network Latency**: 99% of requests served under 100ms.

## SLO Breach Runbook
1. **DB Downtime**: Check RDS connection pool metrics, storage auto-scaling, and failover status.
2. **K8s API Errors**: Inspect control plane audit logs and node component health.
3. **Latency Spikes**: Review VPC flow logs, egress bandwidth, and pod network throttling.
