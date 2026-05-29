package test

import (
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
)

// DefaultTerraformOptions returns Terraform options pointing at the given module directory.
func DefaultTerraformOptions(t *testing.T, modulePath string) *terraform.Options {
	t.Helper()
	return &terraform.Options{
		TerraformDir: modulePath,
		NoColor:      true,
	}
}

// ApplyAndDestroyWithCleanup applies a Terraform module and registers a cleanup
// function that destroys all managed resources when the test finishes.
func ApplyAndDestroyWithCleanup(t *testing.T, opts *terraform.Options) {
	t.Helper()
	t.Cleanup(func() {
		terraform.Destroy(t, opts)
	})
	terraform.InitAndApply(t, opts)
}

// OutputString returns a Terraform output value as a string.
func OutputString(t *testing.T, opts *terraform.Options, key string) string {
	t.Helper()
	return terraform.Output(t, opts, key)
}
