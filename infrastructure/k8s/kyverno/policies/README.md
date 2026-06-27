# Kyverno policies

This directory holds policy manifests for the GistPin Kyverno baseline.

## Included policies

- require-gistpin-labels: ensures standard workload labels are present
- restrict-image-registries: allows only approved registries
- require-resource-limits: enforces CPU and memory requests/limits

All policies are initially configured with validationFailureAction: Audit so they can be rolled out safely before enforcement is enabled.
