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
| `author` | `Option<Address>` | Optional author address (`None` = anonymous) |
| `location_cell` | `String` | Coarse geographic cell (e.g. H3 or geohash) |
| `content_hash` | `String` | Content hash pointer (e.g. IPFS CID) |
| `created_at` | `u64` | Ledger timestamp at creation |
| `expires_at` | `u64` | Ledger timestamp after which the gist is expired |

### Public Methods

| Method | Returns | Description |
|---|---|---|
| `initialize(admin)` | `Result<(), GistError>` | Set the moderator address. Callable **once**, at deploy time |
| `get_admin()` | `Option<Address>` | The configured moderator, if initialized |
| `post_gist(author, location_cell, content_hash, ttl_secs)` | `Result<u64, GistError>` | Register a new gist; returns its `gist_id` |
| `get_gist(gist_id)` | `Option<Gist>` | Retrieve a gist record by id (expired/hidden records are still returned) |
| `is_active(gist_id)` | `bool` | Exists, not expired, and not hidden |
| `list_gists_by_cell(location_cell, cursor, limit)` | `Vec<Gist>` | Paginated list of **active** gists in a cell |
| `edit_gist(gist_id, new_content_hash)` | `Result<(), GistError>` | Replace the content pointer — **author only** |
| `delete_gist(gist_id)` | `Result<(), GistError>` | Delete your own gist — **author only** |
| `hide_gist(gist_id)` | `Result<(), GistError>` | Soft-hide a gist — **moderator only** |
| `unhide_gist(gist_id)` | `Result<(), GistError>` | Reverse a hide — **moderator only** |
| `remove_gist(gist_id)` | `Result<(), GistError>` | Permanently delete — **moderator only** |
| `report_gist(gist_id)` | `Result<u32, GistError>` | Flag for off-chain review (anyone); returns the new count |
| `report_count(gist_id)` | `u32` | Reports filed against a gist |

Posting works without `initialize`; only moderator actions require it.

### Authorship

`post_gist` supports both modes:

- **Signed** (`author = Some(addr)`) — `addr.require_auth()` is enforced, so a
  gist can never be attributed to an address that did not authorize the call.
  Signed posts are cooldown-limited.
- **Anonymous** (`author = None`) — no authorization required and no cooldown
  (there is no on-chain identity to rate-limit; anonymous abuse is handled
  off-chain by the API layer).

### Expiry & cooldown

| Rule | Value |
|---|---|
| Default TTL (when `ttl_secs` is `None`) | 24 hours |
| Maximum TTL | 7 days |
| Cooldown per (author, cell) | 60 seconds |

Expired gists are excluded from `list_gists_by_cell` but remain retrievable via
`get_gist`; use `is_active` to test expiry.

### Moderation & ownership

| Action | Who | Effect |
|---|---|---|
| `edit_gist` / `delete_gist` | the gist's **author** (`require_auth`) | Anonymous gists are immutable — no provable owner |
| `hide_gist` / `unhide_gist` | **moderator** (`require_auth`) | Soft, reversible. Excluded from listings; still returned by `get_gist` with `hidden = true`, so moderation stays auditable |
| `remove_gist` | **moderator** (`require_auth`) | Permanent and irreversible — prefer `hide_gist` unless the content must not persist |
| `report_gist` | anyone | Advisory only; never hides content on its own |

### Errors

| Error | Code | Raised when |
|---|---|---|
| `TtlZero` | 1 | `ttl_secs` is `0` |
| `TtlTooLong` | 2 | `ttl_secs` exceeds the 7-day maximum |
| `CooldownActive` | 3 | The author posted in this cell < 60s ago |
| `NotFound` | 4 | No gist exists with that id |
| `NotAuthorized` | 5 | Caller is neither the author nor the moderator |
| `AlreadyInitialized` | 6 | `initialize` was called twice |
| `NotInitialized` | 7 | A moderator action ran before `initialize` |
| `AnonymousImmutable` | 8 | Edit/delete attempted on an anonymous gist |

Authorization failures surface as a **trapped `require_auth`** (a panic), not a
`GistError` — that is Soroban's standard behaviour.

### Pagination

`list_gists_by_cell` pages over a **secondary index of gist ids per cell**, so
cost scales with the results in that cell rather than the total number of
gists. `cursor` is a zero-based **offset into that index** (not a gist id).

### Events

Every state change publishes an event with a single `Symbol` topic (the event
name) so off-chain indexers can reconcile. **Keep `gist_posted` in sync with the
backend's `GIST_POSTED_EVENT` constant.**

| Topic | Data payload | Emitted by |
|---|---|---|
| `gist_posted` | the full `Gist` record | `post_gist` |
| `gist_edited` | the updated `Gist` record | `edit_gist` |
| `gist_deleted` | `gist_id: u64` | `delete_gist` |
| `gist_hidden` | `gist_id: u64` | `hide_gist` |
| `gist_unhidden` | `gist_id: u64` | `unhide_gist` |
| `gist_removed` | `gist_id: u64` | `remove_gist` |
| `gist_reported` | `(gist_id: u64, count: u32)` | `report_gist` |

The `Gist` record carries `gist_id`, `author`, `location_cell`, `content_hash`,
`created_at`, `expires_at`, `hidden`.

---

## Deployment

Build, deploy and initialize on testnet:

```bash
./scripts/deploy-testnet.sh <identity> [admin-address]
```

The script runs the tests, builds the release WASM, deploys, and calls
`initialize` to set the moderator. Prerequisites (Rust wasm32 target, the
Stellar CLI, and a funded identity) are listed at the top of the script.

### Deployments

| Network | Contract ID | Moderator | Deployed |
|---|---|---|---|
| testnet | [`CCOVX5S3SYHVKUKM3NUXLH6COIYLV5BL3XD6HPFLLR4VLQEQGINJMDRV`](https://stellar.expert/explorer/testnet/contract/CCOVX5S3SYHVKUKM3NUXLH6COIYLV5BL3XD6HPFLLR4VLQEQGINJMDRV) | `GBFNWEU3OM7QT7Y7UAZU6FHLSJIISTT3MSPBICAK4FSBIF5YL4W6IDCK` | 2026-08-10 |

Verified live: `post_gist` → returned `gist_id 1` and emitted `gist_posted`;
`get_gist`, `is_active`, `list_gists_by_cell`, `get_admin` all read back correctly.

> Record the contract id here after deploying, then set
> `CONTRACT_ID_GIST_REGISTRY` in the backend environment to take it out of
> mock mode.

### Backend integration checklist (Wave 2)

- [ ] Set `CONTRACT_ID_GIST_REGISTRY` to the deployed id.
- [ ] Update `soroban.service.ts` — `post_gist` now takes a 4th argument
      (`ttl_secs: Option<u64>`) and returns a `Result`.
- [ ] `list_gists_by_cell`'s `cursor` is a **`u32` offset into the cell index**,
      no longer a gist id.
- [ ] Decode the `Gist` payload's new `expires_at` and `hidden` fields.
- [ ] Subscribe to the moderation/edit events above, not just `gist_posted`.

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
