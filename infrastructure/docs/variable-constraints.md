# Terraform Variable Constraints

All input variables are validated at `plan` time so bad inputs fail fast with a
clear message instead of producing a broken or non-compliant deployment.

## Where validations live

| Location                     | What it holds                                             |
| ---------------------------- | -------------------------------------------------------- |
| `variables.tf`               | Per-variable `validation` blocks (format, allowed values, ranges). Terraform requires these to sit inside the `variable` they constrain. |
| `variable-validations.tf`    | Reusable regex/allowlist locals, and `check` blocks for cross-variable invariants. |

## Per-variable rules

| Variable             | Constraint                                                        | Error surfaced when… |
| -------------------- | ---------------------------------------------------------------- | -------------------- |
| `region`             | One of the approved regions (`us-east-1`, `us-west-2`, `eu-west-1`). | A non-approved region is set. |
| `environment`        | One of `dev`, `staging`, `prod`.                                 | An unknown environment is set. |
| `project_name`       | 3–32 chars, lowercase alphanumeric + hyphens, no leading/trailing hyphen. | Name would violate AWS resource naming rules. |
| `vpc_id`             | Matches `vpc-xxxxxxxx`.                                          | A malformed VPC id is passed. |
| `vpc_cidr`           | Valid IPv4 CIDR **and** within a private RFC 1918 range.         | CIDR is malformed or public. |
| `private_subnet_ids` | ≥ 2 subnets, each a valid `subnet-xxxxxxxx`.                     | Too few subnets or a malformed id. |
| `public_subnet_ids`  | Each a valid `subnet-xxxxxxxx`.                                  | A malformed id. |
| `tags`               | Must include `Environment`, `Project`, `Owner`; values non-empty. | A mandatory tag is missing or blank. |

## Cross-variable checks

`check` blocks (Terraform ≥ 1.5) assert invariants that span multiple variables.
They report during `plan`/`apply` without hard-blocking, which suits advisory
consistency rules:

- **`environment_region_consistency`** — a `prod` deployment must target an
  approved region.
- **`subnet_capacity`** — public subnets must not outnumber private subnets in a
  private-by-default VPC.

## Custom error messages

Every validation carries a human-readable `error_message` that states the rule
and the fix, e.g.:

```
Error: Invalid value for variable

  on variables.tf line 45:
  45: variable "vpc_cidr" {

vpc_cidr must be within a private RFC 1918 range (10/8, 172.16/12, or 192.168/16).
```

## Adding a new constraint

1. If it constrains a single variable, add a `validation` block inside that
   variable in `variables.tf`.
2. If it spans variables, add an `assert` to a `check` block in
   `variable-validations.tf`.
3. Reuse a pattern from `local.validation_patterns` rather than re-writing a
   regex, so formats stay consistent across the codebase.
