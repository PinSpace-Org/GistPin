package gistpin.images

allowed_registries := {"docker.io/gistpin", "ghcr.io/gistpin", "public.ecr.aws/gistpin"}

violation[msg] {
  container := input.spec.template.spec.containers[_]
  not startswith(container.image, allowed_registries[_])
  msg := sprintf("container %q uses image %q which is not from an approved registry", [container.name, container.image])
}

violation[msg] {
  container := input.spec.template.spec.initContainers[_]
  not startswith(container.image, allowed_registries[_])
  msg := sprintf("init container %q uses image %q which is not from an approved registry", [container.name, container.image])
}
