# Kubernetes Garbage Collection Tuning

Kubelet garbage collection configuration for GistPin Kubernetes clusters.

## Overview

Proper garbage collection tuning prevents node pressure, evictions, and performance degradation. The configuration in `infrastructure/k8s/kubelet-gc-config.yaml` defines thresholds for image GC, container log rotation, and eviction policies.

## Image Garbage Collection

Images are garbage collected when disk usage exceeds the high threshold:

| Parameter | Value | Description |
|-----------|-------|-------------|
| `imageGCHighThresholdPercent` | 85% | Trigger image GC above this usage |
| `imageGCLowThresholdPercent` | 80% | Stop image GC at this usage |
| `imageMinimumGCAge` | 2m | Minimum age before image removal |

## Container Log Rotation

| Parameter | Value | Description |
|-----------|-------|-------------|
| `containerLogMaxSize` | 50Mi | Max log file size before rotation |
| `containerLogMaxFiles` | 5 | Max log files to retain per container |

## Eviction Thresholds

### Hard Eviction (immediate pod termination)

| Signal | Threshold |
|--------|-----------|
| `memory.available` | < 500Mi |
| `nodefs.available` | < 10% |
| `nodefs.inodesFree` | < 5% |
| `imagefs.available` | < 15% |

### Soft Eviction (graceful termination)

| Signal | Threshold | Grace Period |
|--------|-----------|--------------|
| `memory.available` | < 800Mi | 1m30s |
| `nodefs.available` | < 15% | 2m |
| `nodefs.inodesFree` | < 10% | 2m |
| `imagefs.available` | < 20% | 2m |

## Reserved Resources

Resources reserved for system and kubelet daemons:

| Cgroup | CPU | Memory | Ephemeral Storage |
|--------|-----|--------|-------------------|
| kubelet | 200m | 512Mi | 2Gi |
| system | 100m | 256Mi | 1Gi |

## Alerting

Alerting rules in `infrastructure/monitoring/gc-alerts.yml`:

| Alert | Severity | Description |
|-------|----------|-------------|
| GCHighImageUsage | warning | Image FS > 85% |
| GCEvictionThreshold | critical | Eviction signal breached |
| GCMemoryPressure | warning | Memory pressure |
| GCDiskPressure | warning | Disk pressure |

## Related Resources

- [Kubelet GC Config](../k8s/kubelet-gc-config.yaml)
- [GC Alerting Rules](../monitoring/gc-alerts.yml)
- [Node Alerts](../monitoring/node-alerts.yml)
