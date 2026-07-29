resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "gistpin-kubelet-hardened"
  scaling_config { desired_size = 2, max_size = 4, min_size = 1 }
  launch_template {
    name    = aws_launch_template.kubelet.name
    version = "$Latest"
  }
}
resource "aws_launch_template" "kubelet" {
  name_prefix   = "gistpin-kubelet-"
  user_data = base64encode(templatefile("${path.module}/kubelet-bootstrap.sh", {
    kubelet_config = filebase64("${path.module}/../k8s/kubelet-config.yaml")
  }))
}
