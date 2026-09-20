# GistPin Analytics

A Next.js dashboard app for exploring GistPin activity: where gists are posted,
how content ages and expires, moderation signals, and the health of the
on-chain (Stellar / Soroban) pipeline.

This directory is a **fresh scaffold**. It ships a blank shell only; everything
else is built up through the open analytics issues.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Lint | ESLint 9 with `next/core-web-vitals` |

It intentionally mirrors `Frontend/` so the two apps stay consistent.

## Getting started

```bash
cd analytics
cp .env.example .env.local      # then adjust if your backend is not on :3000
npm install
npm run dev                     # http://localhost:3001
```

The dev server runs on port **3001** because the backend and the main
`Frontend/` both default to port 3000.

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server with Turbopack on :3001 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build on :3001 |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

Before opening a PR, `npm run typecheck && npm run lint && npm run build`
should all pass.

## Project layout

```
analytics/
├── src/
│   └── app/            # App Router routes, layout and global styles
├── .env.example        # documented environment variables
└── ...config files
```

As features land, keep to this convention:

- `src/app/**` for routes only, kept thin.
- `src/components/**` for reusable UI.
- `src/lib/**` for pure logic (API client, formatters, transforms).
- `src/hooks/**` for React hooks.

## Data sources

Dashboards read from the GistPin backend REST API
(`NEXT_PUBLIC_GISTPIN_API_URL`, see `.env.example`). Know these limits before
designing a chart:

- `GET /v1/gists` and `GET /v1/gists/count` are **location-scoped**: they
  require `lat` and `lon`, with `radius` between 50 and 5000 metres and
  cursor-paginated results of at most 100. There is currently **no** endpoint
  returning global aggregates.
- `GET /v1/gists/count?breakdown=true` returns per-geohash-cell counts.
- Expired and hidden gists are excluded from those queries by the backend.
- `GET /v1/health` returns `status` (`ok` or `degraded`), a `timestamp` and
  database / PostGIS check results. It does **not** report indexer status.
- `GET /metrics` (unversioned) exposes Prometheus text metrics, including
  `http_requests_total` and `http_request_duration_seconds`.

Anything that needs global or historical aggregates needs a dedicated backend
endpoint; those are tracked as separate backend issues.

## Contributing

- One focused change per PR, referencing the issue it closes.
- Include how you verified the change (screenshots for UI work).
- Do not commit secrets or `.env*` files other than `.env.example`.
