# GistPin Roadmap

A layer-by-layer plan to take GistPin from "three good halves that don't touch" to a living, end-to-end, decentralized app.

**Strategy:** Build bottom-up. Solidify each layer — fully tested and deployed — before building the layer above it consumes it. The contract becomes the source of truth, the backend indexes and serves it, and the frontend consumes the backend.

```
Wave 1: Contract  ──►  Wave 2: Backend  ──►  Wave 3: Frontend
(source of truth)      (index & serve)       (consume & interact)
```

> **Tradeoff we're accepting:** no working end-to-end UI until Wave 3 — but every layer is provably done (tested + deployed) before the next one builds on it.

---

## 🌊 Wave 1 — Contract ✅ **COMPLETE** (except live deploy)

**Goal:** A production-ready, fully tested `GistRegistry` exposing a documented interface + event schema for the backend (Wave 2) to integrate against.

**Status:** All feature code written and **unit-tested (26 tests passing)**, merged to `main`. The one remaining item — the actual **testnet deploy** — is tracked in Wave 2 as [#1022](https://github.com/PinSpace-Org/GistPin/issues/1022) (it needs a funded keypair) and also gates the WASM release-build verification.

- [x] Cleanup — removed stray `vault.rs`/`multi.rs`/`ops.rs`/`rollback.rs` ([#864](https://github.com/PinSpace-Org/GistPin/issues/864))
- [x] Canonical `gist_posted` event ([#873](https://github.com/PinSpace-Org/GistPin/issues/873)) + 6 more (edited/deleted/hidden/unhidden/removed/reported)
- [x] Signed authorship via `require_auth`; anonymous still supported ([#874](https://github.com/PinSpace-Org/GistPin/issues/874))
- [x] Per-cell secondary index — no more O(n) scan; `cursor` is now an index offset ([#875](https://github.com/PinSpace-Org/GistPin/issues/875))
- [x] Expiry: `expires_at` + `ttl_secs` (24h default / 7d max) + `is_active()` ([#876](https://github.com/PinSpace-Org/GistPin/issues/876))
- [x] Per-author-per-cell 60s cooldown; anonymous exempt ([#877](https://github.com/PinSpace-Org/GistPin/issues/877))
- [x] Moderation: `initialize` + `hide`/`unhide`/`remove`/`report`, moderator `require_auth` ([#878](https://github.com/PinSpace-Org/GistPin/issues/878))
- [x] Author `edit_gist`/`delete_gist`; anonymous gists immutable ([#879](https://github.com/PinSpace-Org/GistPin/issues/879))
- [x] 26 tests covering every rule + rejection path ([#880](https://github.com/PinSpace-Org/GistPin/issues/880))
- [x] Deploy script + full ABI/event/error spec in `contracts/README.md` ([#881](https://github.com/PinSpace-Org/GistPin/issues/881))
- [ ] **Live testnet deploy + WASM build verified** → moved to Wave 2 [#1022](https://github.com/PinSpace-Org/GistPin/issues/1022)

Tipping / staking (incentives) are intentionally deferred to a later wave.

---

## 🌊 Wave 2 — Backend (index & serve) — **IN PROGRESS**

**Goal:** Connect the backend to the deployed Wave 1 contract, run the indexer for real, exit mock mode, and expose the contract's capabilities over the REST API.

**Definition of done:** Backend runs against the real testnet contract (out of mock mode) · indexer keeps Postgres in sync with on-chain state · integration tests pass against the live contract.

**Key decision — signed posts (option A / wallet-direct):** the backend only ever submits **anonymous** posts and **reports**; all `require_auth` writes (signed posts, edit/delete, moderation) are signed and submitted by the user's/moderator's **wallet** (Wave 3) and reach the backend via the **indexer**.

Tracked issues (build order):

- [ ] [#1022](https://github.com/PinSpace-Org/GistPin/issues/1022) — **Deploy to testnet + verify WASM build** *(gate; needs a funded keypair)*
- [ ] [#1023](https://github.com/PinSpace-Org/GistPin/issues/1023) — Update `soroban.service.ts` to the new ABI
- [ ] [#1024](https://github.com/PinSpace-Org/GistPin/issues/1024) — Exit mock mode; connect to the deployed contract
- [ ] [#1025](https://github.com/PinSpace-Org/GistPin/issues/1025) — Wire the indexer → Postgres (all 7 events)
- [ ] [#1026](https://github.com/PinSpace-Org/GistPin/issues/1026) — Reflect `hidden`/expiry in the DB + query filtering
- [ ] [#1027](https://github.com/PinSpace-Org/GistPin/issues/1027) — Read + report endpoints; surface moderation/expiry state
- [ ] [#1028](https://github.com/PinSpace-Org/GistPin/issues/1028) — Write path anonymous-only (no unverified authorship)
- [ ] [#1029](https://github.com/PinSpace-Org/GistPin/issues/1029) — API auth model *(default: open for MVP)*
- [ ] [#1030](https://github.com/PinSpace-Org/GistPin/issues/1030) — Integration tests against the real contract path
- [ ] [#1031](https://github.com/PinSpace-Org/GistPin/issues/1031) — Contracts CI + frontend build check *(do early)*

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

*This roadmap tracks direction, not commitments. Concrete work lives in [GitHub issues](https://github.com/PinSpace-Org/GistPin/issues). Done so far: fixes #860–#873 and Wave 1 contract #874–#881 (all merged). In progress: Wave 2 #1022–#1031.*
</content>
