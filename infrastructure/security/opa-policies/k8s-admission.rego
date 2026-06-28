package kubernetes.admission

# Deny containers using the 'latest' image tag
deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf("Container '%v' must not use ':latest' image tag", [container.name])
}

deny[msg] {
  input.request.kind.kind == "Deployment"
  container := input.request.object.spec.template.spec.containers[_]
  endswith(container.image, ":latest")
  msg := sprintf("Deployment container '%v' must not use ':latest' image tag", [container.name])
}

# Deny containers without resource limits
deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not container.resources.limits.memory
  msg := sprintf("Container '%v' must define memory limits", [container.name])
}

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not container.resources.limits.cpu
  msg := sprintf("Container '%v' must define CPU limits", [container.name])
}
