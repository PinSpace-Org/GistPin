# ConfigMap Hot Reload

Many GistPin services can re-read their configuration in place. This mechanism
propagates a ConfigMap change to running pods **without a restart**, validates
that the reload was healthy, and rolls back automatically if it wasn't.

## Why not just restart?

A rolling restart works but throws away warm caches and connection pools and
briefly reduces capacity. For a `log_level` flip or a feature-flag toggle,
signalling the process to re-read config is far cheaper.

## How it works

1. **Watch** — the reloader controller watches ConfigMaps carrying the
   `gistpin.io/reload: "enabled"` annotation in the configured namespaces.
2. **Signal** — when a watched ConfigMap changes, the target named by
   `gistpin.io/reload-target` is signalled (default `SIGHUP`) so it re-reads its
   mounted config.
3. **Validate** — after signalling, the target's health endpoint must report
   healthy within `validation.timeoutSeconds`.
4. **Rollback** — if validation fails, the previous ConfigMap revision is
   restored and the target is re-signalled, returning it to a known-good config.
5. **Event** — a Kubernetes Event is emitted for every reload (success or
   rollback) so the history is visible in `kubectl describe`.

## Components

| File                                                    | Purpose                                     |
| ------------------------------------------------------- | ------------------------------------------- |
| `infrastructure/k8s/configmap-reload/deployment.yaml`   | The reloader controller Deployment + RBAC.  |
| `infrastructure/k8s/configmap-reload/reload-config.yaml`| Reload behaviour + an example opted-in ConfigMap. |
| `infrastructure/docs/configmap-reload.md`               | This document.                              |

## Opting a ConfigMap in

Annotate the ConfigMap and name its target:

```yaml
metadata:
  annotations:
    gistpin.io/reload: "enabled"
    gistpin.io/reload-target: "deployment/backend"
```

The target application must:

- Mount the ConfigMap as a volume (env-var injection cannot be updated live).
- Handle the reload signal (default `SIGHUP`) by re-reading its config file.

Apps that only read config at startup should set `reload.strategy: rollout` so
the reloader performs a rolling restart instead of signalling.

## Reload strategies

| Strategy  | Behaviour                                    | Use when… |
| --------- | -------------------------------------------- | --------- |
| `signal`  | Sends a signal to PID 1; app reloads in place. | The app supports live config reload. |
| `rollout` | Triggers a rolling restart.                  | The app only reads config at boot.  |

## Validation & rollback

The reload is only considered successful if the target passes its health check
within the timeout. A failed reload is automatically reverted to the previous
ConfigMap revision, so a bad config change is self-correcting rather than
leaving pods in a broken state.
