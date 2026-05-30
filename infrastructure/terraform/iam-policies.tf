resource "aws_iam_policy" "lambda_basic" {
  name        = "${var.project_name}-${var.environment}-lambda-basic"
  description = "Least privilege policy for Lambda functions"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.region}:*:log-group:/aws/lambda/${var.project_name}-${var.environment}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface"
        ]
        Resource = "*"
      }
    ]
  })

  tags = { Environment = var.environment, Project = var.project_name }
}

resource "aws_iam_policy" "ec2_ssm" {
  name        = "${var.project_name}-${var.environment}-ec2-ssm"
  description = "Allow EC2 instances to use SSM Session Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:UpdateInstanceInformation",
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ]
      Resource = "*"
    }]
  })

  tags = { Environment = var.environment, Project = var.project_name }
}
