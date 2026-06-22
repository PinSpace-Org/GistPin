# Escalation Matrix

## Purpose
This matrix defines who to alert and when to escalate during infrastructure incidents.

## Escalation Guidelines
- **Immediate escalation** for any incident with potential data loss, security compromise, or full platform outage.
- **Second-level escalation** when the first responder cannot restore service within the standard response window.
- **Notify stakeholders** for prolonged incidents, customer impact, or incidents requiring visible status updates.

## Severity and Response
| Severity | Definition | Initial Responder | Escalation Target | Timeout / Target |
|---|---|---|---|---|
| P1 / Sev-1 | Full platform outage or data loss | On-call Infrastructure Engineer | SRE Lead + Engineering Manager | 15 minutes |
| P2 / Sev-2 | Major feature outage or severe degradation | On-call Infrastructure Engineer | SRE Lead | 30 minutes |
| P3 / Sev-3 | Localized incident or minor degradation | On-call Infrastructure Engineer | Team Lead / Owner | 60 minutes |

## Escalation Path
1. Pager alert fired or incident reported.
2. On-call engineer acknowledges within 15 minutes.
3. If unresolved after the severity target, escalate to SRE Lead.
4. If the incident continues beyond 60 minutes, invite Product Operations and Security as needed.

## Contact matrix
| Role | Primary contact | Escalation contact | Backup contact |
|---|---|---|---|
| On-call Infrastructure | `infra-oncall@example.com` | `sre-lead@example.com` | `eng-manager@example.com` |
| SRE Lead | `sre-lead@example.com` | `eng-manager@example.com` | `security@example.com` |
| Security Incident Response | `security@example.com` | `sec-ops@example.com` | `legal@example.com` |
| Product Operations | `prodops@example.com` | `customer-success@example.com` | `comms@example.com` |

## Escalation actions
- P1 incidents: launch a dedicated bridge and make a status page update immediately.
- P2 incidents: open the incident channel and update every 30 minutes.
- P3 incidents: track the issue and update stakeholders if the incident is expected to last longer than one hour.

## Notes
- If pager or paging provider fails, use direct Slack notification and a phone call to the on-call engineer.
- Document every escalation step and timestamp it in the incident timeline.
