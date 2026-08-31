# Kubernetes Node OS Hardening

Worker nodes are hardened to the **CIS Kubernetes Benchmark, Level 1 (Worker
Node)** profile. Hardening is automated and idempotent, and compliance is
verified by a scan.

## What gets hardened

| Area                 | Controls                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Kernel / sysctl      | Reverse-path filtering, no ICMP redirects, full ASLR, protected sym/hardlinks. |
| Kubelet file perms   | `config.yaml` and `kubelet.conf` restricted to `600`, root-owned.    |
| Audit daemon         | `auditd` installed and enabled to record host security events.       |
| File integrity       | `AIDE` installed and its baseline database initialized.              |

The full control list (with expected states) is declarative in
`infrastructure/security/cis-node-benchmark.yml`.

## Components

| File                                             | Purpose                                       |
| ------------------------------------------------ | --------------------------------------------- |
| `infrastructure/scripts/harden-nodes.sh`         | Applies hardening; `--scan` verifies it.      |
| `infrastructure/security/cis-node-benchmark.yml` | Declarative benchmark (controls + expected).  |
| `infrastructure/docs/node-hardening.md`          | This document.                                |

## Applying

Delivered to each node via a privileged bootstrap DaemonSet or node user-data:

```bash
sudo ./infrastructure/scripts/harden-nodes.sh
```

The script is **idempotent** — re-running it converges to the desired state and
only initializes the AIDE database on first run.

## Verifying compliance

```bash
sudo ./infrastructure/scripts/harden-nodes.sh --scan
```

The scan checks each control against its expected state and exits non-zero if
any control is non-compliant, so it can gate a node before it joins the pool or
run as a periodic compliance job.

## Notes on specific controls

- **`net.ipv4.ip_forward`** stays enabled — the CNI requires it. It is audited
  rather than disabled.
- **AIDE** stores its baseline database at `/var/lib/aide/`. After an
  intentional change to system files, re-initialize the database so future scans
  compare against the new baseline.
- **auditd** rules should be layered on top per your logging policy; this script
  guarantees the daemon is present and running.

## Continuous compliance

Run `--scan` on a schedule (node DaemonSet or CronJob) and alert on a non-zero
exit so drift from the hardened baseline is detected rather than discovered
during an incident.
