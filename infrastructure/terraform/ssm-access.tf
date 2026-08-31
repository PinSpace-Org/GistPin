# AWS Systems Manager Session Manager for node access.
# Replaces SSH-based node access with SSM Session Manager: sessions are
# authenticated via IAM, fully logged to S3 (and CloudWatch), and require no
# inbound SSH ingress on the nodes.

# Name of the existing node/instance IAM role to attach Session Manager
# permissions to. Declared here (rather than in variables.tf) to keep this
# feature self-contained.
variable "node_instance_role_name" {
  description = "IAM role name of the Kubernetes worker nodes, for SSM access attachment"
  type        = string
}

# --- Session log bucket ----------------------------------------------------

resource "aws_s3_bucket" "ssm_session_logs" {
  bucket = "${var.project_name}-${var.environment}-ssm-session-logs"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Purpose     = "ssm-session-audit"
  }
}

resource "aws_s3_bucket_public_access_block" "ssm_session_logs" {
  bucket                  = aws_s3_bucket.ssm_session_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ssm_session_logs" {
  bucket = aws_s3_bucket.ssm_session_logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

# Retain the session audit trail; expire raw logs after one year.
resource "aws_s3_bucket_lifecycle_configuration" "ssm_session_logs" {
  bucket = aws_s3_bucket.ssm_session_logs.id
  rule {
    id     = "expire-session-logs"
    status = "Enabled"
    expiration {
      days = 365
    }
  }
}

resource "aws_cloudwatch_log_group" "ssm_sessions" {
  name              = "/${var.project_name}/${var.environment}/ssm/sessions"
  retention_in_days = 365

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- Node instance role: grant Session Manager access ----------------------

# The managed policy that lets the SSM agent register the node and open sessions.
resource "aws_iam_role_policy_attachment" "node_ssm_core" {
  role       = var.node_instance_role_name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Allow the node to ship session logs to the audit bucket and log group.
resource "aws_iam_role_policy" "node_session_logging" {
  name = "${var.project_name}-${var.environment}-ssm-session-logging"
  role = var.node_instance_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SessionLogsToS3"
        Effect = "Allow"
        Action = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.ssm_session_logs.arn}/*"
      },
      {
        Sid      = "SessionLogsToCloudWatch"
        Effect   = "Allow"
        Action   = ["logs:PutLogEvents", "logs:CreateLogStream", "logs:DescribeLogStreams"]
        Resource = "${aws_cloudwatch_log_group.ssm_sessions.arn}:*"
      }
    ]
  })
}

# --- Session preferences document -----------------------------------------
# Forces encryption, idle timeout, and dual logging for every session opened
# against these nodes.

resource "aws_ssm_document" "session_preferences" {
  name            = "SSM-SessionManagerRunShell"
  document_type   = "Session"
  document_format = "JSON"

  content = jsonencode({
    schemaVersion = "1.0"
    description   = "GistPin Session Manager preferences: encrypted, logged, idle-timeout."
    sessionType   = "Standard_Stream"
    inputs = {
      s3BucketName                = aws_s3_bucket.ssm_session_logs.id
      s3EncryptionEnabled         = true
      cloudWatchLogGroupName      = aws_cloudwatch_log_group.ssm_sessions.name
      cloudWatchEncryptionEnabled = true
      cloudWatchStreamingEnabled  = true
      idleSessionTimeout          = "15"
      shellProfile = {
        linux = "cd /tmp && export HISTFILE=/var/log/ssm-session-history"
      }
    }
  })

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# --- Remove SSH ingress ----------------------------------------------------
# A dedicated node security group with NO inbound SSH (port 22) rule. Node
# groups should reference this SG so SSH access is impossible; all interactive
# access flows through Session Manager instead.
resource "aws_security_group" "nodes_no_ssh" {
  name        = "${var.project_name}-${var.environment}-nodes-no-ssh"
  description = "Node SG with no SSH ingress; access via SSM Session Manager only"
  vpc_id      = var.vpc_id

  # Intentionally NO ingress rule for tcp/22.

  egress {
    description = "Allow all egress (SSM agent needs outbound HTTPS to reach AWS endpoints)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
    Access      = "ssm-only"
  }
}

output "ssm_session_log_bucket" {
  description = "S3 bucket storing SSM Session Manager session logs"
  value       = aws_s3_bucket.ssm_session_logs.id
}
