<!--
Module documentation standard. Every Terraform module in this repo MUST provide
a README with the sections below. Sections marked (required) are enforced by
infrastructure/ci/validate-module-docs.yml. Delete these comments when copying
the template.
-->

# `<module-name>`

> One-sentence summary of what this module provisions.

## Overview (required)

A short paragraph: what the module creates, when to use it, and any important
design decisions or constraints.

## Usage (required)

A complete, copy-pasteable example:

```hcl
module "example" {
  source = "../modules/<module-name>"

  environment  = "staging"
  project_name = "gistpin"
  # ...required inputs...
}
```

## Requirements (required)

| Requirement | Version  |
| ----------- | -------- |
| terraform   | >= 1.5   |
| aws         | ~> 5.0   |

## Inputs (required)

<!-- Keep in sync with variables.tf. Every variable MUST have a description. -->

| Name           | Description                        | Type          | Default | Required |
| -------------- | ---------------------------------- | ------------- | ------- | :------: |
| `environment`  | Deployment environment.            | `string`      | n/a     | yes      |
| `project_name` | Project name used in resource names.| `string`     | `"gistpin"` | no   |

## Outputs (required)

<!-- Keep in sync with outputs.tf. Every output MUST have a description. -->

| Name  | Description                     |
| ----- | ------------------------------- |
| `id`  | Identifier of the created resource. |

## Notes

Anything else: cost considerations, gotchas, links to runbooks.
