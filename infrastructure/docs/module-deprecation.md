# Terraform Module Deprecation Process

## Overview

This document defines the process for deprecating Terraform modules in the GistPin
infrastructure codebase. Following this process ensures that consuming teams have
adequate notice and a clear migration path before any module is removed.

## Deprecation Timeline

```
Deprecation announced       30-day warning (CI warns)     Sunset (CI blocks)
        │                            │                           │
        ▼                            ▼                           ▼
  T+0 months ──────────── T+5 months ──────────────── T+6 months
```

| Phase | Duration | Action |
|-------|----------|--------|
| Announcement | Day 0 | Mark module deprecated, add README notice, notify consumers |
| Active deprecation | Months 0–5 | CI warns on usage; module still functional |
| 30-day warning | Month 5 | CI warning becomes louder; Slack reminders sent weekly |
| Sunset | Month 6 | Module removed; CI blocks any remaining references |

## Step-by-Step Process

### 1. Decide on Deprecation

- Open a GitHub Issue with label `terraform-deprecation` describing:
  - Which module(s) will be deprecated
  - The reason (replaced by better module, security issue, architectural change)
  - The proposed sunset date (minimum 6 months from announcement)
  - The replacement module path

### 2. Mark the Module as Deprecated

Move or copy the module to `infrastructure/terraform/deprecated-modules/` and add a
`README.md` with the deprecation notice (see template below).

Add a deprecation warning to the module's `main.tf`:

```hcl
# ⚠️  DEPRECATED: This module will be removed on YYYY-MM-DD.
# Migrate to: modules/replacement-module-path
# See: infrastructure/docs/module-deprecation.md

locals {
  _deprecation_warning = (
    "Module 'legacy-vpc' is deprecated and will be removed on 2026-11-01. "
    "Please migrate to 'modules/networking/vpc'."
  )
}
```

### 3. Notify Consumers

Run the notification script to identify all current consumers:

```bash
bash infrastructure/scripts/notify-module-consumers.sh
```

Then notify affected teams via:
- GitHub Issue comment tagging relevant teams
- Slack message in `#infrastructure` with the migration guide link
- Update the module deprecation table in this document

### 4. Provide a Migration Guide

Update the **Deprecated Modules** table in
`infrastructure/terraform/deprecated-modules/README.md` and document:

- Before/after code examples
- Any breaking changes in the new module's interface
- Required new variables or removed variables
- How to run `terraform init -upgrade` and `terraform plan` after migrating

### 5. CI Enforcement

Update `infrastructure/ci/cycle-detection.yml` (or a dedicated deprecation-check
workflow) to run the notification script in `--strict` mode as a warning:

```yaml
- name: Check for deprecated module usage
  run: bash infrastructure/scripts/notify-module-consumers.sh
  continue-on-error: true   # warn only during active deprecation phase
```

Switch `continue-on-error` to `false` during the 30-day warning window.

### 6. Remove the Module

On the sunset date:
1. Delete the module directory from `deprecated-modules/`
2. Update the deprecation table (mark as "Removed")
3. Close the deprecation GitHub Issue

---

## Deprecated Modules Registry

| Module | Deprecated | Sunset | Status | Replacement |
|--------|-----------|--------|--------|-------------|
| `legacy-vpc` | 2026-05-01 | 2026-11-01 | ⚠️ Active | `modules/networking/vpc` |
| `old-ecs-service` | 2026-05-01 | 2026-11-01 | ⚠️ Active | `modules/compute/ecs-service` |
| `basic-rds` | 2026-06-01 | 2026-11-01 | ⚠️ Active | `modules/database/rds-cluster` |
| `static-site-s3` | 2026-06-15 | 2026-11-01 | ⚠️ Active | `modules/storage/static-site` |

---

## README Template

Use this template when creating the `README.md` for a newly deprecated module:

```markdown
# ⚠️ DEPRECATED: <module-name>

**Sunset date:** YYYY-MM-DD
**Replacement:** `path/to/replacement-module`
**Migration guide:** [Module Deprecation Guide](../../docs/module-deprecation.md)

This module is deprecated. No new features will be added. Bug fixes will only be
applied for critical security issues until the sunset date.

## Why deprecated?

<reason>

## How to migrate

1. Update your `source` to point to the replacement module.
2. Review breaking changes in the replacement module's CHANGELOG.
3. Run `terraform init -upgrade && terraform plan` to validate the migration.
```

---

## References

- [Terraform Module Versioning Best Practices](https://developer.hashicorp.com/terraform/language/modules/develop/publish)
- [Semantic Versioning](https://semver.org/)
- Internal: `infrastructure/terraform/deprecated-modules/README.md`
