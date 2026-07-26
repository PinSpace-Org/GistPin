# Kubernetes GPU Workloads & Scheduling

## Architecture
- **Terraform Node Group**: Provisioned with `g4dn.xlarge` instances with auto-scaling limits (0-3).
- **NVIDIA Device Plugin**: Deployed as a DaemonSet to expose GPU hardware metrics and limits to Kubernetes pods.

## Resource Allocation & Tolerations
Pod specifications requesting GPU must declare:
```yaml
resources:
  limits:
    nvidia.com/gpu: 1
tolerations:
  - key: "nvidia.com/gpu"
    operator: "Exists"
    effect: "NoSchedule"
```
