package gistpin.secrets

violation[msg] {
  input.kind == "Secret"
  not re_match("^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", input.metadata.name)
  msg := sprintf("secret name %q does not follow convention: lowercase alphanumeric with hyphens", [input.metadata.name])
}

violation[msg] {
  input.kind == "Secret"
  count(input.data) == 0
  msg := sprintf("secret %q has no data", [input.metadata.name])
}
