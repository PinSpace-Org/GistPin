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

### 5. Connecting to the live testnet contract (optional)

By default the backend runs in **mock mode** — `postGist` fabricates an id
and never touches the chain. To exercise the real Soroban path:

1. Generate a testnet identity (do **not** use the project moderator key):

   ```bash
   stellar keys generate my-backend-dev --network testnet --fund
   stellar keys show my-backend-dev   # prints the secret key
   ```

2. Set these three env vars in your `.env`:

   ```
   CONTRACT_ID_GIST_REGISTRY=CCOVX5S3SYHVKUKM3NUXLH6COIYLV5BL3XD6HPFLLR4VLQEQGINJMDRV
   SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
   STELLAR_SECRET_KEY=<secret from step 1>
   ```

3. Start the dev server and POST a gist:

   ```bash
   curl -X POST http://localhost:3000/v1/gists \
     -H 'Content-Type: application/json' \
     -d '{"content":"testing live mode","lat":9.05,"lon":7.49}'
   ```

   The response should include a real `tx_hash` (verifiable on
   [stellar.expert](https://stellar.expert/explorer/testnet/contract/CCOVX5S3SYHVKUKM3NUXLH6COIYLV5BL3XD6HPFLLR4VLQEQGINJMDRV))
   and an on-chain `gist_id`.

4. To return to mock mode, remove or blank out `CONTRACT_ID_GIST_REGISTRY`.

---

## API Overview

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

`authorAddress` is optional — used only as an off-chain display/filter hint.

> **Security Note — Wallet-Direct Model for Signed Posts:**
> All backend-submitted on-chain posts (`POST /gists`) are provably anonymous (`author = None`) on-chain. The backend cannot verify ownership of a client-supplied `authorAddress` without a signed transaction, so it never attributes posts on-chain on the caller's behalf. Signed/attributed posts must be submitted directly client-side by the user's wallet.

**What happens internally:**
1. Validate + sanitise input
2. Pin content to IPFS → receive CID
3. Derive `locationCell` from `(lat, lon)` via geohash
4. Submit `post_gist(author, locationCell, contentHash)` to Soroban
5. Persist the record in Postgres
6. Return the created gist

---

## Authentication

The MVP API is **open by design**. All endpoints are publicly accessible with no API-key requirement. Abuse prevention is handled by:

- **Global rate limiting** — NestJS throttler configured via `THROTTLE_TTL_MS` and `THROTTLE_LIMIT` env vars (defaults: 10 requests / 60 s).
- **Per-route throttling** — write endpoints (`POST /gists`) have a tighter limit (10 / 60 s) via `@Throttle`.
- **On-chain rate limiting** — the `GistRegistry` contract enforces a 60-second cooldown per (author, cell) for signed posts.

An API-key module (`ApiKeyGuard` + `ApiKeyService`) was prototyped but intentionally removed — the anonymous-first ethos of GistPin means requiring keys would break the core UX. API-key auth is a pre-launch follow-up if needed.

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
| `npm run test:integration` | Integration tests (including contract-indexer end-to-end flow) |

---

## Contribution Guidelines

- Keep business logic in `services/`, keep controllers thin (validate + delegate only).
- Breaking API changes must be opened as an issue before implementation.
- All new behaviour should come with a unit or e2e test.

---

## License

[MIT](../LICENSE)
