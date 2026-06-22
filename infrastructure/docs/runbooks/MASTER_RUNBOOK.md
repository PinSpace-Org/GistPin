# Infrastructure Master Runbook

## Purpose
This master runbook is the single source of truth for infrastructure operations, incident response, and recovery guidance for the GistPin platform.

## Scope
Includes critical service dependencies, escalation procedures, emergency response actions, recovery checklists, and post-mortem guidance.

## Navigation
- [Service Dependency Map](#service-dependency-map)
- [Escalation Procedures](#escalation-procedures)
- [Emergency Contacts](#emergency-contacts)
- [Recovery Checklists](#recovery-checklists)
- [Post-Mortem Templates](#post-mortem-templates)
- [Related Runbooks](#related-runbooks)

---

## Service Dependency Map
Understanding how services depend on each other helps prioritize response during an outage.

### High-Level Dependencies
- Users / Clients
  - Web frontend
  - Mobile or API clients
- Frontend
  - Backend API
  - CDN / edge cache
- Backend
  - Primary database
  - Cache layer
  - Message queue / event bus
  - Object storage
  - External payment / notification / analytics APIs
- Infrastructure
  - Kubernetes cluster
  - Load balancer
  - DNS
  - Networking
  - Secrets management
- Observability
  - Monitoring / alerting
  - Logging
  - Tracing

### Dependency Graph
```text
[Users] --> [Frontend] --> [Backend] --> [Database]
                                 |--> [Cache]
                                 |--> [Queue]
                                 |--> [Object Storage]
                                 |--> [External APIs]

[Backend] --> [Auth Service]
[Backend] --> [Analytics Pipeline]
[Frontend] --> [CDN]
[Infrastructure] --> [Kubernetes] --> [Pods / Services]
[Infrastructure] --> [Load Balancer]
[Infrastructure] --> [DNS]
[Observability] --> [Monitoring]
[Observability] --> [Logging]
```

### Notes
- A failure in the primary database is a critical path issue for most backend functions.
- Cache outages may degrade performance but often are mitigated by healthy fallbacks.
- External API failures should be treated as degraded service if timeouts or rate limits impact user-facing functionality.
- Network and DNS failures can affect all services and should be escalated immediately.

---

## Escalation Procedures
Use the escalation matrix in `escalation-matrix.md` to identify the correct response path for a given incident severity.

### Primary escalation flow
1. Detect incident through alerts, customer reports, or dashboards.
2. Assess severity and impacted service(s).
3. Notify the on-call engineer for the affected service.
4. If the issue is unresolved within the target response window, escalate to the next tier.
5. Record all decisions, actions, and communications in the incident channel.

### Severity definitions
- P1 / Sev-1: Platform outage or data loss affecting most users.
- P2 / Sev-2: Major feature outage or degraded system behavior with significant impact.
- P3 / Sev-3: Localized issue, non-critical degradation, or maintenance event.

---

## Emergency Contacts
Maintain up-to-date contact information in the internal directory.

### Core contacts
- On-call Infrastructure Engineer: `infra-oncall@example.com`
- Site Reliability Lead: `sre-lead@example.com`
- Engineering Manager: `eng-manager@example.com`
- Security Incident Response: `security@example.com`
- Product Operations: `prodops@example.com`

### Communication channels
- Pager: PagerDuty / OpsGenie
- Slack: `#incident-response`, `#infra-alerts`
- Email: `incident@example.com`
- Status page: `https://status.gistpin.example.com`

> Note: If this documentation is accessed during an incident, verify contact details against the live internal directory before relying on them.

---

## Recovery Checklists
Use these checklists as an operational guide and update incident notes continuously.

### Initial response checklist
- [ ] Confirm alert validity and scope
- [ ] Identify impacted service(s)
- [ ] Determine incident severity
- [ ] Notify on-call and relevant stakeholders
- [ ] Open incident channel and set status message
- [ ] Capture current system state and recent changes
- [ ] Take a safe snapshot of logs and metrics

### Containment checklist
- [ ] Isolate the failing component if possible
- [ ] Pause or reroute traffic away from affected services
- [ ] Disable nonessential jobs or integrations
- [ ] Prevent further user impact or data corruption

### Recovery checklist
- [ ] Restore service using the fastest safe recovery path
- [ ] Roll back the last deployment if needed
- [ ] Fail over to standby systems if configured
- [ ] Verify data integrity and consistency
- [ ] Confirm health checks and synthetic tests pass
- [ ] Reopen traffic once the service is stable

### Post-recovery checklist
- [ ] Monitor system stability for at least one incident window
- [ ] Document the root cause and recovery actions
- [ ] Notify stakeholders with resolution summary
- [ ] Create or update a post-mortem
- [ ] Identify long-term fixes and follow up

---

## Post-Mortem Templates
The canonical template is available in `post-mortem-template.md`.

### Use cases
- P1 and P2 incidents must have a completed post-mortem within 24 hours.
- P3 incidents should have a retrospective summary when corrective actions are required.

### Post-mortem workflow
1. Fill out the incident summary and timeline.
2. Confirm root cause, contributing factors, and failure modes.
3. Assign action items with owners and due dates.
4. Share the completed post-mortem with the incident review group.
5. Track completion of corrective actions and lessons learned.

---

## Related Runbooks
- `deployment-failure.md`
- `database-down.md`
- `high-cpu.md`
- `escalation-matrix.md`
- `emergency-procedures.md`
- `post-mortem-template.md`
