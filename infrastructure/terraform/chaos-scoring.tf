locals {
  chaos_experiments = {
    pod_failure = {
      name         = "pod-failure-experiment"
      namespace    = "gistpin-staging"
      target       = "gistpin-backend"
      failure_rate = 0.3
      duration     = "300s"
    }
    network_delay = {
      name       = "network-delay-experiment"
      namespace  = "gistpin-staging"
      target     = "gistpin-frontend"
      latency_ms = 2000
      jitter_ms  = 500
      duration   = "120s"
    }
    cpu_stress = {
      name        = "cpu-stress-experiment"
      namespace   = "gistpin-staging"
      target      = "gistpin-api"
      cpu_workers = 2
      duration    = "180s"
    }
  }

  scoring_weights = {
    availability = 0.35
    latency      = 0.25
    error_rate   = 0.20
    throughput   = 0.10
    recovery     = 0.10
  }
}

resource "chaos_experiment" "pod_failure" {
  count = var.enable_chaos_testing ? 1 : 0

  experiment {
    name         = local.chaos_experiments.pod_failure.name
    namespace    = local.chaos_experiments.pod_failure.namespace
    target       = local.chaos_experiments.pod_failure.target
    failure_rate = local.chaos_experiments.pod_failure.failure_rate
    duration     = local.chaos_experiments.pod_failure.duration
  }

  scoring {
    availability_weight = local.scoring_weights.availability
    latency_weight      = local.scoring_weights.latency
    error_rate_weight   = local.scoring_weights.error_rate
    throughput_weight   = local.scoring_weights.throughput
    recovery_weight     = local.scoring_weights.recovery
  }
}

resource "chaos_experiment" "network_delay" {
  count = var.enable_chaos_testing ? 1 : 0

  experiment {
    name       = local.chaos_experiments.network_delay.name
    namespace  = local.chaos_experiments.network_delay.namespace
    target     = local.chaos_experiments.network_delay.target
    latency_ms = local.chaos_experiments.network_delay.latency_ms
    jitter_ms  = local.chaos_experiments.network_delay.jitter_ms
    duration   = local.chaos_experiments.network_delay.duration
  }

  scoring {
    availability_weight = local.scoring_weights.availability
    latency_weight      = local.scoring_weights.latency
    error_rate_weight   = local.scoring_weights.error_rate
    throughput_weight   = local.scoring_weights.throughput
    recovery_weight     = local.scoring_weights.recovery
  }
}

output "chaos_scoring_summary" {
  value = var.enable_chaos_testing ? {
    experiments_enabled = length(local.chaos_experiments)
    scoring_weights     = local.scoring_weights
  } : null
}
