# Infrastructure Security Scorecard Methodology

## Overview

The security scorecard provides a weekly automated rating of the GistPin infrastructure security posture across four weighted categories.

## Scoring Categories

| Category    | Weight | Description                                         |
|-------------|--------|-----------------------------------------------------|
| Network     | 25%    | Network policies, WAF, egress controls, DNS security |
| IAM         | 25%    | Roles, policies, IRSA, access analyzer, boundaries   |
| Encryption  | 25%    | Secrets management, TLS, at-rest encryption, S3      |
| Monitoring  | 25%    | CloudTrail, GuardDuty, SIEM, Falco, audit logging    |

## Scoring Formula

```
Overall Score = (Network × 0.25) + (IAM × 0.25) + (Encryption × 0.25) + (Monitoring × 0.25)
```

Each category is scored 0-100 based on the presence and configuration of security controls.

## Grade Scale

| Grade | Score Range | Meaning                           |
|-------|-------------|-----------------------------------|
| A+    | 90-100      | Excellent security posture        |
| A     | 80-89       | Strong security posture           |
| B     | 70-79       | Good security posture             |
| C     | 60-69       | Adequate security, improvements needed |
| D     | 50-59       | Weak security, immediate action required |
| F     | 0-49        | Critical security gaps            |

## Historical Trend Tracking

Score trends are tracked in Grafana using Prometheus metrics:
- `security_scorecard_overall_score`
- `security_scorecard_category_score`

Weekly snapshots are stored as JSON reports in `infrastructure/ci/reports/`.

## Remediation Priority

Remediation items are automatically prioritized:
1. Categories scoring below 70 are flagged
2. Items sorted by score ascending (lowest first)
3. Each category provides specific remediation steps

## Execution

```bash
# Run scorecard for production
./infrastructure/scripts/security-scorecard.sh --environment production

# Run with Slack notification
SLACK_WEBHOOK=https://hooks.slack.com/... ./infrastructure/scripts/security-scorecard.sh -e production

# CI integration
./infrastructure/scripts/security-scorecard.sh -e production -r ci/reports
```

## CI Integration

The scorecard runs weekly via GitHub Actions and fails the pipeline if the overall score drops below 60.
