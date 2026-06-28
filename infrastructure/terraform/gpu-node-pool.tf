locals {
  gpu_node_pools = {
    primary = {
      name              = "gpu-pool-primary"
      machine_type      = "n1-standard-4"
      accelerator_type  = "nvidia-tesla-t4"
      accelerator_count = 1
      min_nodes         = 0
      max_nodes         = 10
      disk_size_gb      = 100
      disk_type         = "pd-standard"
    }
    high_mem = {
      name              = "gpu-pool-high-mem"
      machine_type      = "n1-highmem-8"
      accelerator_type  = "nvidia-tesla-v100"
      accelerator_count = 1
      min_nodes         = 0
      max_nodes         = 5
      disk_size_gb      = 200
      disk_type         = "pd-ssd"
    }
  }
}

resource "google_container_node_pool" "gpu_primary" {
  count = var.enable_gpu_node_pools ? 1 : 0

  name       = local.gpu_node_pools.primary.name
  location   = var.region
  cluster    = var.cluster_name
  node_count = local.gpu_node_pools.primary.min_nodes

  autoscaling {
    min_node_count = local.gpu_node_pools.primary.min_nodes
    max_node_count = local.gpu_node_pools.primary.max_nodes
  }

  node_config {
    machine_type = local.gpu_node_pools.primary.machine_type
    disk_size_gb = local.gpu_node_pools.primary.disk_size_gb
    disk_type    = local.gpu_node_pools.primary.disk_type

    guest_accelerator {
      type  = local.gpu_node_pools.primary.accelerator_type
      count = local.gpu_node_pools.primary.accelerator_count
    }

    labels = {
      pool     = "gpu-primary"
      workload = "ml-inference"
    }
  }
}

resource "google_container_node_pool" "gpu_high_mem" {
  count = var.enable_gpu_node_pools ? 1 : 0

  name       = local.gpu_node_pools.high_mem.name
  location   = var.region
  cluster    = var.cluster_name
  node_count = local.gpu_node_pools.high_mem.min_nodes

  autoscaling {
    min_node_count = local.gpu_node_pools.high_mem.min_nodes
    max_node_count = local.gpu_node_pools.high_mem.max_nodes
  }

  node_config {
    machine_type = local.gpu_node_pools.high_mem.machine_type
    disk_size_gb = local.gpu_node_pools.high_mem.disk_size_gb
    disk_type    = local.gpu_node_pools.high_mem.disk_type

    guest_accelerator {
      type  = local.gpu_node_pools.high_mem.accelerator_type
      count = local.gpu_node_pools.high_mem.accelerator_count
    }

    labels = {
      pool     = "gpu-high-mem"
      workload = "ml-training"
    }
  }
}

output "gpu_node_pool_names" {
  value = var.enable_gpu_node_pools ? values(local.gpu_node_pools)[*].name : []
}
