output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.ephemeral.name
}

output "cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = aws_eks_cluster.ephemeral.endpoint
}

output "kubeconfig_base64" {
  description = "Base64-encoded kubeconfig for the ephemeral cluster"
  sensitive   = true
  value = base64encode(templatefile("${path.module}/kubeconfig.tpl", {
    cluster_name     = aws_eks_cluster.ephemeral.name
    cluster_endpoint = aws_eks_cluster.ephemeral.endpoint
    cluster_ca       = aws_eks_cluster.ephemeral.certificate_authority[0].data
    region           = var.region
  }))
}

output "cost_tag" {
  description = "Cost-tracking tag value for this environment"
  value       = "ephemeral/${var.environment}"
}
