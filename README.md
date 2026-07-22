# GistPin — Location-Aware Micro-Messaging on Stellar

> An open, decentralized platform for anonymous, hyperlocal communication. Post short, geotagged messages — **"gists"** — anchored to real-world coordinates, and discover crowd-sourced tips, alerts, and conversations happening around you.

GistPin bridges Web2 and Web3: a fast, familiar map-based UI on top of a geospatial indexing API, with each gist anchored immutably on the **Stellar / Soroban** blockchain for integrity, verifiability, and censorship resistance.

---

## Project status

GistPin is an early-stage, actively developed open-source project. Here's an honest snapshot of where each layer stands:

| Layer | Status | Notes |
|---|---|---|
| **Smart contract** (`contracts/`) | ✅ MVP implemented & tested | `GistRegistry` — post, get, and list gists by location cell. Anonymous posting supported. |
| **Backend API** (`Backend/`) | ✅ Largely implemented | NestJS + PostGIS geo queries, IPFS pinning, Soroban client (with dev mock mode), rate limiting, metrics, e2e tests. |
| **Frontend** (`Frontend/`) | 🚧 UI prototype | Map + posting UI built, but currently runs on **mock data** — not yet wired to the backend, no wallet integration yet. |
| **End-to-end flow** | ❌ Not yet connected | Frontend ↔ Backend ↔ Contract are each functional in isolation; connecting them is the current priority. |

See the [open issues](https://github.com/PinSpace-Org/GistPin/issues) for the concrete work items, and the [Roadmap](#roadmap) below for direction.

---

## Architecture

```
┌─────────────────────────┐
│   Frontend (Next.js)     │   Map-based UI — browse & post gists
│   React · Leaflet · TS   │
└───────────┬─────────────┘
            │ REST (/v1)
┌───────────▼─────────────┐
│   Backend (NestJS)       │   Geospatial indexer + API
│   PostGIS · IPFS · TS    │   • Query gists by radius (ST_DWithin)
│                          │   • Pin content to IPFS (Pinata)
│                          │   • Submit + index Soroban events
└───────────┬─────────────┘
            │ Soroban RPC
┌───────────▼─────────────┐
│  Contract (Soroban/Rust) │   GistRegistry
│  Stellar Network         │   • Anchors gist_id, location_cell,
│                          │     content_hash on-chain
└─────────────────────────┘
```

**How a gist flows through the system:**
1. User drops a gist on the map (text + coordinates).
2. Backend sanitizes the input and pins the full content to **IPFS**, receiving a content hash (CID).
3. Backend derives a coarse **location cell** (geohash) from the coordinates.
4. Backend submits `post_gist(author, location_cell, content_hash)` to the **Soroban** `GistRegistry` contract.
5. The record is persisted in **Postgres + PostGIS** for fast radius queries.
6. Nearby users retrieve it via `GET /v1/gists?lat=…&lon=…&radius=…`.

---

## Repository layout

```
GistPin/
├── Frontend/         # Next.js 15 + React 19 web client (map UI)
├── Backend/          # NestJS API + Soroban indexer + PostGIS
├── contracts/        # Soroban (Rust) smart contracts — GistRegistry
├── analytics/        # Standalone analytics dashboard (separate app)
├── infrastructure/   # Kubernetes, Terraform, CI, monitoring (DevOps)
└── docker-compose.yml
```

Each core module has its own README with deeper detail:
- [`Frontend/README.md`](Frontend/README.md)
- [`Backend/README.md`](Backend/README.md)
- [`contracts/README.md`](contracts/README.md)

---

## Quick start

The fastest way to get the API and database running is Docker Compose:

```bash
# Postgres + PostGIS and the backend API
docker compose up
# API:      http://localhost:3000
# Swagger:  http://localhost:3000/v1/docs
```

### Run each layer manually

<details>
<summary><strong>Backend</strong> (NestJS + PostGIS)</summary>

```bash
cd Backend
npm install
cp .env.example .env          # fill in DATABASE_* at minimum
npm run start:dev             # http://localhost:3000
```

Requires PostgreSQL 15+ with the PostGIS extension. Soroban and IPFS credentials are optional in dev — the backend falls back to mock mode when they're unset. See [`Backend/README.md`](Backend/README.md) for full setup.
</details>

<details>
<summary><strong>Frontend</strong> (Next.js)</summary>

```bash
cd Frontend
npm install
npm run dev                   # http://localhost:3000
```
</details>

<details>
<summary><strong>Contracts</strong> (Soroban / Rust)</summary>

```bash
cd contracts
rustup target add wasm32-unknown-unknown
cargo test
cargo build --target wasm32-unknown-unknown --release
```

See [`contracts/README.md`](contracts/README.md) for deploy instructions.
</details>

---

## Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Leaflet / react-leaflet, Tailwind CSS v4 |
| **Backend** | NestJS 11, TypeScript, PostgreSQL + PostGIS, TypeORM, `@stellar/stellar-sdk`, IPFS (Pinata), Winston, Prometheus |
| **Contract** | Rust, Soroban SDK, `wasm32-unknown-unknown` |
| **Blockchain** | Stellar Network (Soroban smart contracts) |

---

## Why Stellar

- **High throughput, low fees** — enabling scalable, near-free community interactions.
- **Soroban smart contracts** — composable Rust logic for content anchoring and governance.
- **Fast finality** — near-instant anchoring of posts.
- **Asset primitives** — a foundation for future tipping, staking, and reputation systems.

---

## Roadmap

Grouped by theme — see [issues](https://github.com/PinSpace-Org/GistPin/issues) for the tracked work.

**Make it real (connect the stack)**
- Wire the frontend to the backend API (replace mock gist data with live fetch/post).
- Stellar wallet integration for optional cryptographic authorship.
- Activate the on-chain indexer so gists posted directly on-chain appear in results.

**Solidify (trust & safety)**
- Authorship verification via Stellar signatures.
- Gist expiry / cooldown and spatial access rules.
- Content moderation (reporting + on-chain moderation).

**Grow (incentives & scale)**
- Tipping and micropayments between local contributors.
- Staking / reputation for quality contributions.
- Off-chain storage bridging (IPFS/Arweave) for larger payloads.

---

## Contributing

Contributions are welcome. A good place to start is the [`good first issue`](https://github.com/PinSpace-Org/GistPin/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) label.

- Discuss interface/API/contract changes in an issue before implementation.
- Keep controllers thin and business logic in services (backend).
- New behavior should ship with test coverage.

---

## License

[MIT](LICENSE)
</content>
</invoke>
