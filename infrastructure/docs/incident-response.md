# Incident Response

## Severity Levels

| Level | Response Time | Examples |
|-------|--------------|---------|
| P1 | Immediate | DB down, full outage |
| P2 | 15 min | High CPU, deployment failure |
| P3 | 1 hour | Degraded performance |

## Escalation Path

1. On-call engineer (PagerDuty)
2. Team lead
3. Engineering manager

## Runbooks

- [High CPU](runbooks/high-cpu.md)
- [Database Down](runbooks/database-down.md)
- [Deployment Failure](runbooks/deployment-failure.md)

## Post-Mortem Template

```markdown
## Incident: <title>
**Date:** YYYY-MM-DD  
**Severity:** P1/P2/P3  
**Duration:** Xh Ym  

### What happened
<brief description>

### Root cause
<root cause>

### Timeline
- HH:MM — alert fired
- HH:MM — investigation started
- HH:MM — resolved

### Action items
- [ ] <preventive action>
```
