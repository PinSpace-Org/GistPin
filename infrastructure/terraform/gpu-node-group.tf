# infrastructure/terraform/gpu-node-group.tf
# GPU node group configuration for ML workloads with cost controls.

resource "aws_eks_node_group" "gpu_nodes" {
  cluster_name    = var.cluster_name
  node_group_name = "gpu-ml-node-group"
  node_role_arn   = var.node_role_arn
  subnet_ids      = var.private_subnet_ids

  scaling_config {
    desired_size = 1
    max_size     = 3
    min_size     = 0
  }

  instance_types = ["g4dn.xlarge"]
  ami_type       = "AL2_x86_64_GPU"

  labels = {
    workload_type = "ml-inference"
    accelerator   = "nvidia-gpu"
  }

  taint {
    key    = "nvidia.com/gpu"
    value  = "present"
    effect = "NO_SCHEDULE"
  }
}
