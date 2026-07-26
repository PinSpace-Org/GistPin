# Automated Security Patch Management Policy

## Patch Schedule & Execution
- **Frequency**: Automated weekly execution on Sundays at 2:00 AM UTC.
- **CVE Scanning**: Trivy / AWS Inspector scan prior to patching.
- **Validation & Rollback**: Automatic post-patch smoke testing runs via `service-check.sh`. If validation fails, automated rollback triggers instantly.
- **Compliance Reporting**: Compliance metrics are reported to monitoring channels.
