data "aws_iam_openid_connect_provider" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

locals {
  oidc_provider_arn = data.aws_iam_openid_connect_provider.eks.arn
  oidc_provider_url = replace(
    data.aws_iam_openid_connect_provider.eks.url,
    "https://",
    ""
  )
  namespace = "gistpin"
}

resource "aws_iam_role" "backend_irsa" {
  name = "gistpin-backend-irsa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:sub" = "system:serviceaccount:${local.namespace}:backend"
          }
        }
      }
    ]
  })
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy" "backend_s3" {
  name = "gistpin-backend-s3"
  role = aws_iam_role.backend_irsa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.main.arn,
          "${aws_s3_bucket.main.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_dynamodb" {
  name = "gistpin-backend-dynamodb"
  role = aws_iam_role.backend_irsa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [aws_dynamodb_table.main.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "backend_secretsmanager" {
  name = "gistpin-backend-secretsmanager"
  role = aws_iam_role.backend_irsa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:gistpin/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role" "frontend_irsa" {
  name = "gistpin-frontend-irsa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:sub" = "system:serviceaccount:${local.namespace}:frontend"
          }
        }
      }
    ]
  })
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy" "frontend_s3" {
  name = "gistpin-frontend-s3"
  role = aws_iam_role.frontend_irsa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "frontend_cloudfront" {
  name = "gistpin-frontend-cloudfront"
  role = aws_iam_role.frontend_irsa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = [aws_cloudfront_distribution.main.arn]
      }
    ]
  })
}

resource "aws_iam_role" "ci_irsa" {
  name = "gistpin-ci-irsa"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${local.oidc_provider_url}:sub" = "system:serviceaccount:tekton-pipelines:tekton-worker"
          }
        }
      }
    ]
  })
  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "ci_admin" {
  role       = aws_iam_role.ci_irsa.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
