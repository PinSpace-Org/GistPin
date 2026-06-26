package kubernetes.security

# Deny privileged containers
deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  container.securityContext.privileged == true
  msg := sprintf("Container '%v' must not run as privileged", [container.name])
}

# Deny containers running as root (UID 0)
deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  container.securityContext.runAsUser == 0
  msg := sprintf("Container '%v' must not run as root (UID 0)", [container.name])
}

# Deny host network access
deny[msg] {
  input.request.kind.kind == "Pod"
  input.request.object.spec.hostNetwork == true
  msg := "Pod must not use host network"
}

# Deny host PID access
deny[msg] {
  input.request.kind.kind == "Pod"
  input.request.object.spec.hostPID == true
  msg := "Pod must not share host PID namespace"
}
