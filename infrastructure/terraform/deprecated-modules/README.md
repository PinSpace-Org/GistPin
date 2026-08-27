# ⚠️ Deprecated Terraform Modules

> **These modules are deprecated and will be removed on 2026-11-01.**
> Please migrate to the replacement modules listed below before the sunset date.

---

## Deprecation Notice

The modules in this directory (`infrastructure/terraform/deprecated-modules/`) are
**no longer maintained** and will be deleted from the repository on **2026-11-01**.

Using deprecated modules after the sunset date will cause Terraform plans to fail in CI.

---

## Deprecated Modules

| Module | Deprecated Since | Sunset Date | Replacement |
|--------|-----------------|-------------|-------------|
| `legacy-vpc` | 2026-05-01 | 2026-11-01 | `modules/networking/vpc` |
| `old-ecs-service` | 2026-05-01 | 2026-11-01 | `modules/compute/ecs-service` |
| `basic-rds` | 2026-06-01 | 2026-11-01 | `modules/database/rds-cluster` |
| `static-site-s3` | 2026-06-15 | 2026-11-01 | `modules/storage/static-site` |

---

## Migration Guide

Full step-by-step migration instructions are available in the documentation:

📖 **[Module Deprecation & Migration Guide](../../docs/module-deprecation.md)**

### Quick Migration Example

**Before (deprecated):**
```hcl
module "network" {
  source = "../../terraform/deprecated-modules/legacy-vpc"

  cidr_block   = "10.0.0.0/16"
  environment  = var.environment
}
```

**After (replacement):**
```hcl
module "network" {
  source = "../../terraform/modules/networking/vpc"

  cidr_block         = "10.0.0.0/16"
  environment        = var.environment
  enable_flow_logs   = true   # new required field
}
```

---

## Getting Help

- Open a GitHub Discussion tagged `#terraform-migration` for questions.
- Ping `@infra-platform` in Slack for urgent migration assistance.
- Run the notification script to identify all usages in your workspace:
  ```bash
  bash infrastructure/scripts/notify-module-consumers.sh
  ```

---

## What Happens After Sunset

After **2026-11-01**, deprecated modules will be removed. Any Terraform configuration
still referencing them will fail with:

```
Error: Module not found
  Could not find module "deprecated-modules/legacy-vpc"
```

CI pipelines will block merges that reference deprecated modules starting **2026-10-01**
(30-day warning period).
