# API Gateway — GistPin

## Overview

GistPin uses **Kong Gateway** (self-hosted, DB-less declarative mode) as the single entry point for all API traffic. Kong runs as a Kubernetes Deployment behind an AWS NLB, and configuration is managed via `deck sync` in CI.

```
Client → NLB → Kong (api-gateway ns) → Upstream service (gistpin ns)
```

---

## Configuration files

| File | Purpose |
|---|---|
| `config.yaml` | Services, routes, global plugins, consumers |
| `plugins/jwt-auth.yaml` | Per-route JWT overrides |
| `plugins/rate-limiting.yaml` | Tiered rate limits by consumer group |

Changes are applied automatically on merge to `main` via the CI pipeline.

---

## Routing

| Path prefix | Upstream service | Port |
|---|---|---|
| `/api/v1/gists` | `gist-service` | 8080 |
| `/api/v1/auth/*` | `auth-service` | 8081 |
| `/api/v1/users` | `user-service` | 8082 |
| `/api/v1/search` | `search-service` | 8083 |

All routes are versioned under `/api/v1/`. Future versions add a new prefix and new service entry — old routes remain until deprecated.

---

## Authentication

JWT validation is enforced globally. Tokens must:

- Be passed in the `Authorization: Bearer <token>` header.
- Include `exp`, `nbf`, and `iss` claims.
- Not exceed 24 hours in validity (`maximum_expiration: 86400`).
- Reference a valid key via the `kid` header claim.

**Public routes** (no token required):

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/refresh`

Unauthenticated requests to public routes are mapped to the `anonymous` consumer and subject to the anonymous rate limit (20 req/min).

---

## Rate limiting

Rate limiting is enforced at two layers:

### Global (all routes)

| Tier | Per minute | Per hour |
|---|---|---|
| Anonymous (unauthenticated) | 120 | 3 000 |
| Auth public routes | 20 | 100 |

### Consumer group tiers

| Group | Per minute | Per hour |
|---|---|---|
| `free-tier` | 60 | 1 000 |
| `pro-tier` | 300 | 10 000 |
| `enterprise-tier` | 2 000 | 100 000 |

Rate limit headers are returned on every response:

```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 42
```

Exceeding the limit returns HTTP `429` with a JSON error body.

---

## Request transformation

The following headers are **removed** from responses to prevent information leakage:

- `X-Powered-By`
- `Server`
- `X-Kong-Upstream-Latency`

A `X-Request-ID` (UUID v4) is injected into every request for distributed tracing and echoed back in the response.

---

## Observability

- **Prometheus** metrics are exposed at `:8100/metrics` on each Kong pod and scraped by the cluster's Prometheus via `ServiceMonitor`.
- **Access logs** are forwarded to Fluentbit (`http://fluentbit.logging:9880/kong`) and aggregated in the central logging stack.
- Key metrics to watch: `kong_http_requests_total`, `kong_upstream_latency_ms`, `kong_bandwidth_bytes`.

---

## Applying changes

```bash
# Validate config locally
deck validate --config infrastructure/k8s/api-gateway/config.yaml

# Dry-run diff against live gateway
deck diff \
  --config infrastructure/k8s/api-gateway/config.yaml \
  --kong-addr http://kong-admin.api-gateway.svc.cluster.local:8001

# Apply (CI does this automatically on merge to main)
deck sync \
  --config infrastructure/k8s/api-gateway/config.yaml \
  --kong-addr http://kong-admin.api-gateway.svc.cluster.local:8001
```

---

## Adding a new service

1. Add a `service` entry to `config.yaml` with the internal cluster DNS URL.
2. Add one or more `route` entries pointing to the new service.
3. Apply any route-specific plugins in the `plugins/` directory.
4. Open a PR — CI will run `deck diff` and post the diff as a PR comment.
5. Merge to `main` to apply.

---

## Security notes

- The Kong Admin API (`8001`) is **not** exposed externally. Access is restricted to in-cluster traffic only via `NetworkPolicy`.
- mTLS between Kong and upstream services is enforced via the `mtls-auth` plugin (configured separately in the service mesh layer).
- Bot detection is enabled globally. Known malicious user-agent patterns are blocked automatically.