variable "required_tags" {
  description = "Map of required tags and their default values"
  type        = map(string)
  default = {
    Environment = "development"
    Owner       = "unknown"
    CostCenter  = "engineering"
    Project     = "gistpin"
  }
}

locals {
  required_tag_keys = keys(var.required_tags)
}

check "required_tags" {
  data "aws_default_tags" "current" {}

  assert {
    condition = alltrue([
      for key in local.required_tag_keys : contains(keys(data.aws_default_tags.current.tags), key)
    ])
    error_message = format(
      "Missing required tags: %s. All resources must have tags: %s",
      join(", ", setsubtract(local.required_tag_keys, keys(data.aws_default_tags.current.tags))),
      join(", ", local.required_tag_keys)
    )
  }
}

resource "aws_config_config_rule" "required_tags" {
  name        = "required-tags"
  description = "Ensures all AWS resources have required tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key = "Environment"
    tag2Key = "Owner"
    tag3Key = "Project"
  })

  depends_on = [aws_config_configuration_recorder.main]
}

resource "aws_config_configuration_recorder" "main" {
  name     = "gistpin-config-recorder"
  role_arn = aws_iam_role.config_recorder.arn

  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

resource "aws_iam_role" "config_recorder" {
  name = "gistpin-config-recorder"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_recorder" {
  role       = aws_iam_role.config_recorder.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSConfigRole"
}
