# Local Terraform Development

Developers can iterate on the Terraform configuration locally with **no cloud
access and no cloud spend** using the mock provider overlay in
`infrastructure/terraform/dev/`.

## What the overlay gives you

- A **mock AWS provider** pointed at [LocalStack](https://localstack.cloud), so
  `plan`/`apply` simulate AWS resources locally.
- A **local state backend** isolated from production remote state — a botched
  local apply can never corrupt shared state.

The overlay is its own root module; it does not share providers or state with
the production root in `infrastructure/terraform/`.

## Prerequisites

```bash
# Terraform >= 1.5 and LocalStack
brew install terraform localstack        # or your platform's package manager
localstack start -d                       # starts LocalStack on :4566
```

## Setup

```bash
cd infrastructure/terraform/dev
terraform init
terraform plan     # runs against LocalStack, no real credentials
terraform apply
```

By default `mock_mode = true`, so:

- The provider uses fake static credentials (`mock`/`mock`).
- Credential/account/region network checks are skipped.
- Every AWS service call is routed to the LocalStack endpoint.
- S3 uses path-style addressing (LocalStack's requirement).

## Pointing at a real sandbox instead

To run against a real sandbox account rather than LocalStack:

```bash
terraform apply -var="mock_mode=false"
# ...with real AWS credentials in your environment
```

With `mock_mode = false` the endpoint overrides and credential skips are
disabled, and the provider behaves like a normal AWS provider.

## CI mock mode

CI can run `plan` in mock mode to validate the configuration on every PR without
cloud credentials:

```bash
cd infrastructure/terraform/dev
terraform init -input=false
terraform plan -input=false -var="mock_mode=true" -var="localstack_endpoint=http://localstack:4566"
```

This catches configuration errors (invalid references, type mismatches, failed
`validation` rules) early, in a hermetic environment.

## State isolation

The dev overlay writes state to `terraform.dev.tfstate` in the overlay
directory. `*.tfstate` is git-ignored — never commit local state, and never
point the dev overlay at the production backend.

## Confirming you're in mock mode

```bash
terraform output backend_mode       # -> local (.../terraform.dev.tfstate)
terraform output mock_mode_active   # -> true
```
