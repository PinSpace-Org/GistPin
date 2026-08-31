# Terraform State Reconciliation

After importing resources — or when something changes a resource out-of-band —
Terraform state can drift from the real configuration. This tooling detects that
drift, categorizes it, generates fix configurations, and applies the
reconciliation safely.

## When to use it

- After a bulk `terraform import` (imported resources often need config added to
  match their real attributes).
- When a `plan` shows unexpected changes you didn't author (out-of-band drift).
- Periodically, to catch drift before it compounds.

## Workflow

```bash
# Detect + report (no changes)
./infrastructure/scripts/reconcile-state.sh

# After reviewing the report and generated fixes:
./infrastructure/scripts/reconcile-state.sh --apply
```

1. **Detect** — a refresh + plan surfaces state-vs-real and config-vs-state
   differences. `-detailed-exitcode` distinguishes "no drift" from "drift".
2. **Categorize** — `generate-fix-configs.py` sorts each drifted resource into:
   - **update** — config reconciles it on apply (in-place).
   - **replace** — destroy + recreate (the report lists the attributes forcing
     replacement, so you can decide if that's acceptable).
   - **delete** — state has a resource the config no longer declares.
   - **import-needed** — config declares a resource missing from state.
3. **Generate fixes** — for import-needed resources, `import {}` blocks are
   scaffolded with a clearly-marked `REAL_ID` placeholder (the tool never
   guesses a resource id).
4. **Report** — a markdown reconciliation report summarizes everything.
5. **Apply** — with `--apply`, the **exact reviewed plan** is applied, so nothing
   new can sneak in between plan and apply.

## Components

| File                                              | Purpose                                       |
| ------------------------------------------------- | --------------------------------------------- |
| `infrastructure/scripts/reconcile-state.sh`       | Orchestrates detect → categorize → report → apply. |
| `infrastructure/scripts/generate-fix-configs.py`  | Categorizes drift and generates fix config.   |
| `infrastructure/docs/state-reconciliation.md`     | This document.                                |

## Outputs

Everything lands under `./reconciliation/` (override with `OUT_DIR`):

| File                          | Contents                                     |
| ----------------------------- | -------------------------------------------- |
| `drift.tfplan`                | The saved binary plan (applied verbatim on `--apply`). |
| `drift.plan.json`             | JSON plan the categorizer reads.             |
| `reconciliation-report.md`    | Human-readable drift summary.                |
| `fixes.generated.tf`          | Generated `import {}` blocks (advisory).      |

## Safe apply

The `--apply` path applies the **saved plan**, not a fresh one. This is the key
safety property: you review exactly what will change, and that exact set is what
gets applied — a resource that drifted between your review and the apply won't be
silently included.

## Import blocks

Generated `import {}` blocks intentionally leave `id = "REAL_ID"`. Fill in the
real resource id (from the cloud console or CLI) before applying — this prevents
the tool from importing the wrong resource by guessing.
