# Terratest Guide

Terratest provides automated infrastructure testing for GistPin Terraform modules.

## Test Structure

```
infrastructure/terraform/tests/
├── test_helper.go       # Shared test utilities and helpers
├── vpc_test.go          # VPC module tests
├── eks_test.go          # EKS module tests
└── go.mod / go.sum      # Go module dependencies
```

Tests follow Go conventions:
- Each file tests a single Terraform module
- Test functions are named `Test<ModuleName><Scenario>`
- All tests use `test_helper.go` for Terraform setup/teardown
- Assertions use `testify/assert`

## Running Tests Locally

Prerequisites:
- Go 1.22+
- Terraform 1.7.5+
- AWS credentials configured

```bash
# Run all tests
cd infrastructure/terraform/tests
go test -v -timeout 30m ./...

# Run a specific test
go test -v -timeout 30m -run TestVpcCreation ./...

# Run with shorter timeout for fast feedback
go test -v -timeout 10m -short ./...
```

## Writing New Tests

1. Create a new `<module_name>_test.go` file in the tests directory
2. Import `test_helper.go` via the `test` package
3. Use `DefaultTerraformOptions` to point at your module
4. Wrap test setup with `ApplyAndDestroyWithCleanup` for automatic cleanup
5. Assert outputs using `terraform.Output` and `testify/assert`

```go
func TestMyModuleCreation(t *testing.T) {
    opts := DefaultTerraformOptions(t, "../modules/my-module")
    ApplyAndDestroyWithCleanup(t, opts)

    output := terraform.Output(t, opts, "my_output")
    assert.Equal(t, "expected", output)
}
```

## Best Practices

- Keep tests idempotent and independent
- Always use `ApplyAndDestroyWithCleanup` for cleanup
- Test both happy path and edge cases (empty inputs, boundary values)
- Use `t.Parallel()` for independent tests to speed up runs
- Tag slow tests with `t.Skip("slow")` for `-short` mode
- Validate resource attributes (counts, CIDRs, ARNs) not just existence

## CI Integration

Tests run automatically via the `terratest.yml` GitHub Actions workflow on:
- Pull requests modifying `infrastructure/terraform/**`
- Pushes to `main` that modify `infrastructure/terraform/**`

Results are posted as PR comments and artifacts are retained for 30 days.
