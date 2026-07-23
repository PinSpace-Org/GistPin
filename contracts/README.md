# GistPin Contracts

On-chain infrastructure for **GistPin** — a location-aware gist platform built on the **Stellar / Soroban** blockchain.

The contracts handle registering gists as verifiable blockchain records, organizing them by geographic location, and supplying metadata for off-chain indexers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Rust |
| Smart Contract Framework | [Soroban SDK](https://developers.stellar.org/docs/build/smart-contracts/overview) |
| Build Tools | `cargo`, `stellar-cli` |
| Target | `wasm32-unknown-unknown` |
| License | MIT |

---

## Project Structure

```
contracts/
├── src/
│   └── lib.rs       # GistRegistry contract
├── Cargo.toml
└── README.md
```

All contracts live in a single crate for now, with flexibility to split into separate packages as complexity grows.

---

## GistRegistry Contract (MVP)

### Data Model

Each gist record tracks:

| Field | Type | Description |
|---|---|---|
| `gist_id` | `u64` | Auto-incremented identifier |
| `author` | `Option<Address>` | Optional author address |
| `location_cell` | `String` | Coarse geographic cell (e.g. H3 or geohash) |
| `content_hash` | `String` | Content hash pointer (e.g. IPFS CID) |
| `created_at` | `u64` | Ledger timestamp at creation |

### Public Methods

| Method | Description |
|---|---|
| `post_gist(author, location_cell, content_hash)` | Register a new gist; returns its `gist_id` |
| `get_gist(gist_id)` | Retrieve a gist record by id |
| `list_gists_by_cell(location_cell, cursor, limit)` | Paginated list of gists within a location cell |

### Events

`post_gist` publishes a single canonical event that off-chain indexers
(the backend) subscribe to. **Keep this in sync with the backend's
`GIST_POSTED_EVENT` constant.**

| Field | Value |
|---|---|
| Topic (event name) | `gist_posted` (a `Symbol`) |
| Data payload | the full `Gist` record (`gist_id`, `author`, `location_cell`, `content_hash`, `created_at`) |

---

## Planned Contracts

| Contract | Purpose |
|---|---|
| **Tipping** | Tip mechanisms for gist authors |
| **Staking** | Stakeholder systems |
| **Moderation** | On-chain content moderation |

---

## Getting Started

### Requirements

- Rust (≥ 1.70) — [install via rustup](https://rustup.rs)
- `wasm32-unknown-unknown` target
- `stellar-cli` — [install guide](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)

### Install Rust target

```bash
rustup target add wasm32-unknown-unknown
```

### Install Stellar CLI

```bash
cargo install --locked stellar-cli --features opt
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Test

```bash
cargo test
```

### Deploy (local testnet)

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/gistpin_contracts.wasm \
  --network testnet \
  --source <your-identity>
```

---

## Contribution Guidelines

- Modifications to contract interfaces require prior discussion via a linked issue and design documentation.
- Public functions should remain compact and well-documented.
- New functionality must be accompanied by test coverage.

---

## License

[MIT](../LICENSE)
