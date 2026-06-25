# Automated Security Remediation

Architecture, workflow, safe-fix rules, human approval process, and
audit trail for GistPin's automated security remediation system.

---

## Architecture Overview

    compliance-checks.sh
          |
          v
    compliance-report-<ts>.json
          |
          v
    remediate-findings.sh
          |
          +-- risk: auto ---------> run playbook immediately
          |                               |
          |                               v
          |                        audit-trail-<ts>.json
          |
          +-- risk: approval-required --> pending-approval-<ts>.json
                                               |
                                               v
                                        human reviews + approves
                                               |
                                               v
                                        run playbook manually

All actions (auto and manual) are written to the audit trail.
Dry-run mode is available for every step.

---

## Components

| File                                          | Role                                         |
|-----------------------------------------------|----------------------------------------------|
| scripts/remediate-findings.sh                 | Main entrypoint; classifies and dispatches   |
| security/remediation-playbooks/playbook-registry.yml | Maps finding IDs to playbooks + risk  |
| security/remediation-playbooks/fix-ssh.sh     | Remediates CIS-1.1, CIS-1.2 (SSH)           |
| security/remediation-playbooks/fix-firewall.sh| Remediates CIS-2.1, CIS-2.2 (firewall)      |
| security/remediation-playbooks/fix-k8s-rbac.sh| Remediates CIS-3.1, CIS-3.2 (K8s RBAC)     |
| ci/reports/remediation-audit-<ts>.json        | Full audit trail for every run               |
| ci/reports/pending-approval-<ts>.json         | Queue of findings requiring human sign-off   |

---

## Risk Classification

Every finding in the playbook registry carries one of two risk levels:

**auto** -- the fix is safe to apply without human review:
- Has no availability impact
- Is fully reversible (backup taken before change)
- Cannot lock out operators

**approval-required** -- a human must review before the fix runs:
- May restart a service or the API server
- May affect network access (firewall, RBAC)
- Has legal or compliance implications (GDPR, PCI)
- Requires Terraform apply with state lock

Current auto-fix findings: CIS-1.1, CIS-1.2, CIS-2.2
Current approval-required findings: CIS-1.3, CIS-2.1, CIS-3.1, CIS-3.2, GDPR-1, GDPR-2, PCI-1, PCI-2

---

## Usage

### Run against the latest compliance report

    ./infrastructure/scripts/remediate-findings.sh

### Run against a specific report

    ./infrastructure/scripts/remediate-findings.sh \
      infrastructure/ci/reports/compliance-report-20240610-120000.json

### Dry-run (no changes made, full audit log still written)

    ./infrastructure/scripts/remediate-findings.sh --dry-run
    # or
    DRY_RUN=true ./infrastructure/scripts/remediate-findings.sh

### Override playbook directory

    PLAYBOOK_DIR=infrastructure/security/remediation-playbooks \
      ./infrastructure/scripts/remediate-findings.sh

---

## CI Integration

Add to your pipeline after compliance-checks.sh:

    - name: Auto-remediate findings
      run: |
        ./infrastructure/scripts/remediate-findings.sh \
          infrastructure/ci/reports/compliance-report-latest.json
      continue-on-error: true   # exit 1 = pending approvals, not a hard failure

    - name: Upload remediation artifacts
      uses: actions/upload-artifact@v4
      with:
        name: remediation-reports
        path: infrastructure/ci/reports/remediation-audit-*.json

Exit codes returned by the script:
- 0 -- all failed findings were auto-remediated
- 1 -- some findings are queued for human approval (not a pipeline failure)
- 2 -- critical error (missing files, playbook crash, config invalid)

---

## Human Approval Process

When findings are queued for approval, the script writes a
pending-approval-<ts>.json file. Reviewers should:

1. Read the approval queue:

    cat infrastructure/ci/reports/pending-approval-latest.json | jq .

2. Review the finding, the reason it requires approval, and the
   playbook that will be run.

3. Test in a non-production environment first:

    PLAYBOOK_DIR=infrastructure/security/remediation-playbooks \
      bash infrastructure/security/remediation-playbooks/<playbook>.sh

4. If satisfied, run the playbook on the target system and record
   the approval in the audit log manually:

    jq '. + [{finding_id:"CIS-2.1", action:"manual-approval", status:"APPROVED",
      detail:"reviewed by <name>", actor:"<github-handle>",
      timestamp:"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", dry_run:false}]' \
      infrastructure/ci/reports/remediation-audit-latest.json > /tmp/updated.json
    mv /tmp/updated.json infrastructure/ci/reports/remediation-audit-latest.json

---

## Audit Trail

Every run produces a JSON audit log at:

    infrastructure/ci/reports/remediation-audit-<timestamp>.json

Structure:

    {
      "timestamp": "2024-06-10T12:00:00Z",
      "dry_run": false,
      "summary": {
        "remediated": 2,
        "pending_approval": 3,
        "errors": 0
      },
      "audit_trail": [
        {
          "finding_id": "CIS-1.1",
          "action": "run-playbook:fix-ssh.sh",
          "status": "REMEDIATED",
          "detail": "SSH root login disabled",
          "actor": "ci",
          "timestamp": "2024-06-10T12:00:01Z",
          "dry_run": false
        }
      ],
      "approval_queue": [...]
    }

Audit logs must be retained for a minimum of 90 days per the
compliance policy in infrastructure/docs/compliance.md.

---

## Adding a New Playbook

1. Write the fix script in infrastructure/security/remediation-playbooks/:
   - Follow the existing style (set -euo pipefail, log() function, root check)
   - Take a backup of any file before modifying it
   - Validate config before reloading any service
   - Exit 0 on success, exit 2 on unrecoverable error

2. Register it in playbook-registry.yml:

    - id: CIS-X.Y
      description: Short description matching compliance-checks.sh
      playbook: fix-your-thing.sh
      risk: auto   # or approval-required
      severity: HIGH
      approval_reason: explain why if approval-required
      tags: [relevant, tags]

3. Test with dry-run before merging:

    DRY_RUN=true ./infrastructure/scripts/remediate-findings.sh

---

## Related Docs

- compliance.md -- full compliance framework and check definitions
- security-hardening.md -- manual hardening procedures
- secrets-management.md -- secret rotation and sealed-secrets setup
- incident-response.md -- what to do when a critical finding cannot be auto-fixed
