import {
  id = "vpc-12345678"
  to = aws_vpc.main
}

import {
  id = "subnet-12345678"
  to = aws_subnet.public_a
}

import {
  id = "subnet-87654321"
  to = aws_subnet.private_a
}

import {
  id = "gistpin-eks-cluster"
  to = aws_eks_cluster.main
}

import {
  id = "gistpin-db-prod"
  to = aws_db_instance.main
}

import {
  id = "gistpin-terraform-state"
  to = aws_s3_bucket.terraform_state
}

import {
  id = "gistpin-terraform-locks"
  to = aws_dynamodb_table.terraform_locks
}

import {
  id = "eks-node-role"
  to = aws_iam_role.eks_node
}

import {
  id = "sg-12345678"
  to = aws_security_group.backend
}

import {
  id = "arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/gistpin-alb/abcdef123456"
  to = aws_lb.main
}

import {
  id = "Z1234567890ABCDEFGHIJ_gistpin.io_A"
  to = aws_route53_record.api
}
