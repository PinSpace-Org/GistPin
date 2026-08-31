# Module outputs. Every output MUST carry a `description` — the module-docs
# validator fails a module whose outputs lack one, because the README Outputs
# table is generated from these descriptions.

output "id" {
  description = "Identifier of the primary resource this module creates."
  # value = <resource>.<name>.id
  value = null
}
