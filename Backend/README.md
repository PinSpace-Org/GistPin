# GistPin API

The backend API and on-chain indexer for GistPin. This service is the bridge between the web client and both the Stellar/Soroban blockchain and the Postgres database.

## What This Repo Does

- **Indexes** on-chain events from the `GistRegistry` Soroban contract
- **Stores** enriched gist data in Postgres + PostGIS for fast geospatial queries
- **Exposes** a REST API consumed by the GistPin frontend
- **Bridges** to IPFS/Pinata for full gist content storage (the chain only holds a hash)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Runtime | Node.js >= 20 |
| Framework | NestJS |
| Database | PostgreSQL 15 + PostGIS extension |
| ORM / Query | TypeORM (with PostGIS support) |
| Blockchain | Stellar Horizon + Soroban RPC |
| Storage bridge | IPFS via Pinata (or self-hosted node) |
| Config | `@nestjs/config` with typed configuration |
| Testing | Jest (built into NestJS) |

---

## Project Layout

```
Backend/
├── src/
│   ├── main.ts                    # App bootstrap
│   ├── app.module.ts              # Root module
│   ├── config/
│   │   └── configuration.ts      # Typed config via @nestjs/config
│   ├── gists/                     # Gist feature module
│   │   ├── gists.module.ts
│   │   ├── gists.controller.ts    # Route handlers
│   │   ├── gists.service.ts       # Business logic
│   │   ├── dto/
│   │   │   ├── create-gist.dto.ts
│   │   │   └── query-gists.dto.ts
│   │   └── entities/
│   │       └── gist.entity.ts
│   ├── indexer/                   # Soroban event watcher
│   │   ├── indexer.module.ts
│   │   └── indexer.service.ts
│   ├── soroban/                   # Soroban RPC client wrapper
│   │   ├── soroban.module.ts
│   │   └── soroban.service.ts
│   ├── ipfs/                      # IPFS pinning service
│   │   ├── ipfs.module.ts
│   │   └── ipfs.service.ts
│   └── geo/                       # Geospatial helpers (geohash encoding)
│       └── geo.service.ts
├── test/                          # e2e tests
├── .env.example
├── package.json
└── README.md
```

---

## Prerequisites

- **Node.js** >= 20 — [nodejs.org](https://nodejs.org)
- **PostgreSQL 15** with the **PostGIS extension**
- **npm** (comes with Node.js)

> **Why PostGIS?** The core feature of GistPin is querying gists by distance — *"show me everything within 500m of these coordinates."* PostGIS adds a spatial index that makes this instant, even at scale.

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/PinSpace-Org/GistPin.git
cd GistPin/Backend
npm install
```

### 2. Set up Postgres + PostGIS

**Option A — Docker (quickest)**

```bash
docker run -d \
  --name gistpin-db \
  -e POSTGRES_USER=gist \
  -e POSTGRES_PASSWORD=gist \
  -e POSTGRES_DB=gist \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

**Option B — Homebrew (macOS)**

```bash
brew install postgresql@15 postgis
brew services start postgresql@15
psql -U postgres -c "CREATE USER gist WITH PASSWORD 'gist';"
psql -U postgres -c "CREATE DATABASE gist OWNER gist;"
psql -U gist -d gist -c "CREATE EXTENSION postgis;"
```

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in the values — minimum required for local dev are the `DATABASE_*` fields.

### 4. Start the dev server

```bash
npm run start:dev
```

API available at: `http://localhost:3000`

---

## API Overview

### Authentication & Rate Limiting

The GistPin MVP deliberately adopts an **anonymous-first architecture**:
- Endpoints do not require API keys or token authentication, allowing seamless, permissionless reading and posting.
- Abuse protection and denial-of-service mitigation are enforced via global and route-level rate limiting (`@nestjs/throttler` via `ThrottlerGuard` in `AppModule`), alongside in-flight request tracking and payload validation.
- Per-key API authorization was evaluated during early MVP architecture and removed to keep the core API lightweight and aligned with anonymous decentralized interaction. Fine-grained API authentication / developer keys may be reintroduced in a future pre-launch milestone if required for dedicated partner integrations.

### Health

```
GET /health
```

Returns `{ "status": "ok" }`.

### Query Gists by Location

```
GET /gists?lat=5.6037&lon=-0.1870&radius=500&limit=20&cursor=
```

| Param | Type | Default | Description |
|---|---|---|---|
| `lat` | number | required | Latitude |
| `lon` | number | required | Longitude |
| `radius` | number | `500` | Radius in metres (max 5000) |
| `limit` | number | `20` | Max results (max 100) |
| `cursor` | string | — | Pagination cursor |

### Create a Gist

```
POST /gists
Content-Type: application/json
```

```json
{
  "lat": 5.6037,
  "lon": -0.1870,
  "text": "Great street food here tonight",
  "authorAddress": "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

`authorAddress` is optional — anonymous posting is fully supported.

**What happens internally:**
1. Validate + sanitise input
2. Pin content to IPFS → receive CID
3. Derive `locationCell` from `(lat, lon)` via geohash
4. Submit `post_gist(author, locationCell, contentHash)` to Soroban
5. Persist the record in Postgres
6. Return the created gist

---

## Database Model

Table: `gists`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Internal primary key |
| `gist_id` | `bigint` UNIQUE | On-chain ID from GistRegistry contract |
| `location_cell` | `text` | Coarse geohash cell |
| `location` | `geography(Point, 4326)` | PostGIS point for geo queries |
| `lat` | `float8` | Stored for convenience |
| `lon` | `float8` | Stored for convenience |
| `content_cid` | `text` | IPFS CID |
| `text` | `text` | Full gist text (cached from IPFS) |
| `author_address` | `text` | Nullable — anonymous posts allowed |
| `tx_hash` | `text` | Stellar transaction hash |
| `created_at` | `timestamptz` | |

---

## Indexer

`src/indexer/indexer.service.ts` runs as a background NestJS worker. On startup it polls the Soroban RPC for new `GistRegistry` contract events and upserts each into Postgres. This keeps the DB in sync with on-chain state — gists posted directly on-chain still appear in query results.

---

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Start with hot-reload |
| `npm run build` | Compile TypeScript |
| `npm run start:prod` | Run compiled output |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |

---

## Contribution Guidelines

- Keep business logic in `services/`, keep controllers thin (validate + delegate only).
- Breaking API changes must be opened as an issue before implementation.
- All new behaviour should come with a unit or e2e test.

---

## License

[MIT](../LICENSE)
