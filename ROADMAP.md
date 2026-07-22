# GistPin Roadmap

A layer-by-layer plan to take GistPin from "three good halves that don't touch" to a living, end-to-end, decentralized app.

**Strategy:** Build bottom-up. Solidify each layer — fully tested and deployed — before building the layer above it consumes it. The contract becomes the source of truth, the backend indexes and serves it, and the frontend consumes the backend.

```
Wave 1: Contract  ──►  Wave 2: Backend  ──►  Wave 3: Frontend
(source of truth)      (index & serve)       (consume & interact)
```

> **Tradeoff we're accepting:** no working end-to-end UI until Wave 3 — but every layer is provably done (tested + deployed) before the next one builds on it.

---

## 🌊 Wave 1 — Contract (build end to end)

**Goal:** A production-ready, fully tested set of Soroban contracts deployed to Stellar testnet, exposing a documented interface + event schema that the backend (Wave 2) can integrate against.

**Definition of done:** Deployed on testnet · every method unit-tested · authorship, expiry, cooldown, and moderation working · event schema published · contract IDs + interface documented for Wave 2.

### 1.1 — Cleanup & foundation
- [ ] Remove stray non-compiling files: `vault.rs`, `multi.rs`, `ops.rs`, `rollback.rs` (issue [#864](https://github.com/PinSpace-Org/GistPin/issues/864))
- [ ] Decide crate structure: single crate vs. workspace (needed if we add Tipping/Moderation as separate contracts)

### 1.2 — Harden the core `GistRegistry`
- [ ] **Emit a canonical event** on `post_gist` with a defined, documented schema (this is what the backend indexer will consume — pins down the naming inconsistency in issue [#869](https://github.com/PinSpace-Org/GistPin/issues/869))
- [ ] **Signed authorship:** `require_auth(author)` when an author is provided, so `author` is provably the caller — while keeping the anonymous (no-author) path working
- [ ] **Efficient listing:** maintain a secondary index of gist IDs per `location_cell` to replace the current O(n) linear scan in `list_gists_by_cell`
- [ ] Confirm overflow-safety of the ID counter (release profile already has `overflow-checks = true`)

### 1.3 — Gist lifecycle & spatial rules
- [ ] **Expiry:** store `expires_at` / TTL and expose active-vs-expired state (README promises this)
- [ ] **Cooldown:** per-author posting cooldown per location cell (anti-spam)
- [ ] **Edit/delete by author** (author-authorized only) — decide whether in scope for MVP or deferred

### 1.4 — Moderation (contract level)
- [ ] Flag/report mechanism
- [ ] Admin/moderator ability to hide or remove a gist, with proper access control (`require_auth` on an admin/moderator address)

### 1.5 — Incentives (companion contracts — optional within this wave)
- [ ] **Tipping** contract: send a Stellar asset to a gist author
- [ ] **Staking / reputation** — likely deferred to a later wave, stub the interface only

### 1.6 — Quality & deploy
- [ ] Unit tests for every method and edge case (auth failure, cooldown hit, expired gist, event emission, moderation permissions)
- [ ] Deploy scripts for Stellar testnet
- [ ] **Publish the interface spec** the backend consumes: method signatures, event schema, error codes, deployed contract IDs

---

## 🌊 Wave 2 — Backend (index & serve)

**Goal:** Connect the backend to the deployed Wave 1 contract, run the indexer for real, and expose every capability the frontend needs over the REST API.

**Definition of done:** Backend runs against the real testnet contract (out of mock mode) · indexer keeps Postgres in sync with on-chain state · e2e tests pass against the live contract interface.

### 2.1 — Connect to the real contract
- [ ] Set `CONTRACT_ID_GIST_REGISTRY` to the deployed testnet contract; exit mock mode
- [ ] Align event decoding to the canonical event schema from Wave 1 (issue [#869](https://github.com/PinSpace-Org/GistPin/issues/869))

### 2.2 — Activate the indexer
- [ ] Wire `IndexerModule` into the app so it actually runs (currently never imported)
- [ ] Reconcile on-chain gists into Postgres so gists posted directly on-chain appear in query results

### 2.3 — Serve new contract capabilities
- [ ] Endpoints/filters for expiry (hide expired gists from queries)
- [ ] Authorship verification via Stellar signature
- [ ] Endpoints for moderation (report/hide) and tipping metadata

### 2.4 — Auth & correctness cleanup
- [ ] Decide the auth model: wire up the existing `ApiKeyGuard`/`ApiKeyService` or remove it as dead code
- [ ] Fix `CreateGistDto` duplicate-field bug (issue [#862](https://github.com/PinSpace-Org/GistPin/issues/862))
- [ ] e2e tests exercising the live (non-mock) Soroban path

---

## 🌊 Wave 3 — Frontend (consume & interact)

**Goal:** Turn the prototype UI into the real product — live data, wallet-based authorship, and interaction with everything the backend now serves.

**Definition of done:** A user can post a gist that anchors on-chain and appears on another user's map, with optional signed authorship — no mock data anywhere.

### 3.1 — Go live on real data
- [ ] Build an API client; replace mock `useState` gists and the fake `setTimeout` post with real `POST /v1/gists` and `GET /v1/gists?lat&lon&radius`
- [ ] Loading / error / empty states for real network calls

### 3.2 — Wallet & authorship
- [ ] Stellar wallet integration (Freighter / Stellar Wallets Kit) — replaces the removed EVM wagmi/viem
- [ ] Sign posts for verifiable authorship (optional; anonymous still supported)

### 3.3 — Full feature surface
- [ ] Display authorship, expiry, and tip counts on gists
- [ ] Tipping UI · report/moderation UI
- [ ] Finalize the landing page (issue [#872](https://github.com/PinSpace-Org/GistPin/issues/872)) and metadata (issue [#871](https://github.com/PinSpace-Org/GistPin/issues/871))
- [ ] Real-time / polling updates on the map

---

## Later — Grow

- Off-chain storage bridging (IPFS/Arweave) for larger payloads and images
- Staking / reputation systems for quality contributors
- Richer gist types, notifications, and discovery

---

*This roadmap tracks direction, not commitments. Concrete work lives in [GitHub issues](https://github.com/PinSpace-Org/GistPin/issues); the fix-level issues (#860–#872) feed into the waves above.*
</content>
