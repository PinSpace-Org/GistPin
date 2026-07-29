package gistpin.annotations

required_annotations := {"app.kubernetes.io/name", "app.kubernetes.io/instance", "app.kubernetes.io/managed-by"}

violation[msg] {
  input.kind == "Deployment"
  missing := required_annotations - {k | k := input.metadata.annotations[_]; k}
  count(missing) > 0
  msg := sprintf("missing required annotations: %v", [missing])
}

violation[msg] {
  input.kind == "Service"
  missing := required_annotations - {k | k := input.metadata.annotations[_]; k}
  count(missing) > 0
  msg := sprintf("missing required annotations: %v", [missing])
}
