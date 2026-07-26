# infrastructure/terraform/lifecycle-hooks.tf
# Lifecycle hooks, pre-destroy backups, and post-create validations.

resource "null_resource" "pre_destroy_backup" {
  triggers = {
    db_identifier = var.db_identifier
  }

  provisioner "local-exec" {
    when       = destroy
    command    = "./infrastructure/scripts/pre-destroy-backup.sh ${self.triggers.db_identifier}"
    on_failure = fail
  }
}

resource "null_resource" "post_create_validation" {
  provisioner "local-exec" {
    command    = "echo 'Validating deployment after creation...' && ./infrastructure/scripts/notify-changes.py post-create"
    on_failure = continue
  }
}
