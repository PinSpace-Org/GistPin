#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
    Symbol, Vec,
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/// Lifespan applied when the caller does not supply one.
const DEFAULT_TTL_SECS: u64 = 24 * 60 * 60; // 24 hours
/// Upper bound on a caller-supplied lifespan.
const MAX_TTL_SECS: u64 = 7 * 24 * 60 * 60; // 7 days
/// Minimum gap between two posts by the same author in the same cell.
const COOLDOWN_SECS: u64 = 60;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum GistError {
    /// `ttl_secs` was zero.
    TtlZero = 1,
    /// `ttl_secs` exceeded `MAX_TTL_SECS`.
    TtlTooLong = 2,
    /// This author posted in this cell less than `COOLDOWN_SECS` ago.
    CooldownActive = 3,
}

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub struct Gist {
    pub gist_id: u64,
    pub author: Option<Address>,
    pub location_cell: String,
    pub content_hash: String,
    pub created_at: u64,
    /// Ledger timestamp after which this gist is considered expired.
    pub expires_at: u64,
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// A gist record, keyed by its id.
    Gist(u64),
    /// Ids of every gist posted in a location cell (secondary index).
    CellIndex(String),
    /// Last post timestamp for an (author, cell) pair — drives the cooldown.
    LastPost(Address, String),
}

const GIST_COUNT: Symbol = symbol_short!("GCOUNT");

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct GistRegistry;

#[contractimpl]
impl GistRegistry {
    /// Register a new gist on-chain and return its assigned `gist_id`.
    ///
    /// Authorship:
    /// * `author = Some(addr)` — a *signed* post. `addr.require_auth()` is
    ///   enforced, so a gist can never be attributed to an address that did
    ///   not authorize the call. Signed posts are also cooldown-limited.
    /// * `author = None` — an *anonymous* post. No authorization is required
    ///   and no cooldown applies (there is no on-chain identity to rate-limit;
    ///   anonymous abuse is handled off-chain by the API layer).
    ///
    /// Lifespan: `ttl_secs` defaults to [`DEFAULT_TTL_SECS`] and must be in
    /// `1..=MAX_TTL_SECS`.
    pub fn post_gist(
        env: Env,
        author: Option<Address>,
        location_cell: String,
        content_hash: String,
        ttl_secs: Option<u64>,
    ) -> Result<u64, GistError> {
        let now = env.ledger().timestamp();

        // --- lifespan bounds (#876) ---------------------------------------
        let ttl = ttl_secs.unwrap_or(DEFAULT_TTL_SECS);
        if ttl == 0 {
            return Err(GistError::TtlZero);
        }
        if ttl > MAX_TTL_SECS {
            return Err(GistError::TtlTooLong);
        }
        let expires_at = now.checked_add(ttl).ok_or(GistError::TtlTooLong)?;

        // --- signed authorship (#874) + cooldown (#877) --------------------
        if let Some(addr) = author.clone() {
            // A forged author cannot pass this: the transaction must carry an
            // authorization entry for `addr`.
            addr.require_auth();

            let last_key = DataKey::LastPost(addr, location_cell.clone());
            if let Some(last) = env.storage().persistent().get::<DataKey, u64>(&last_key) {
                if now < last.saturating_add(COOLDOWN_SECS) {
                    return Err(GistError::CooldownActive);
                }
            }
            env.storage().persistent().set(&last_key, &now);
        }

        let gist_id: u64 = env
            .storage()
            .instance()
            .get(&GIST_COUNT)
            .unwrap_or(0u64)
            + 1;

        let gist = Gist {
            gist_id,
            author,
            location_cell: location_cell.clone(),
            content_hash,
            created_at: now,
            expires_at,
        };

        env.storage().persistent().set(&DataKey::Gist(gist_id), &gist);
        env.storage().instance().set(&GIST_COUNT, &gist_id);

        // --- secondary index by cell (#875) --------------------------------
        // Keeps `list_gists_by_cell` proportional to the results in the cell
        // instead of scanning every gist ever posted.
        let idx_key = DataKey::CellIndex(location_cell);
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&idx_key)
            .unwrap_or_else(|| Vec::new(&env));
        ids.push_back(gist_id);
        env.storage().persistent().set(&idx_key, &ids);

        // Canonical event consumed by the off-chain indexer.
        env.events()
            .publish((Symbol::new(&env, "gist_posted"),), gist);

        Ok(gist_id)
    }

    /// Retrieve a gist record by id. Expired gists are still returned so that
    /// callers can inspect them; use [`Self::is_active`] to test expiry.
    pub fn get_gist(env: Env, gist_id: u64) -> Option<Gist> {
        env.storage().persistent().get(&DataKey::Gist(gist_id))
    }

    /// Whether a gist exists and has not yet expired.
    pub fn is_active(env: Env, gist_id: u64) -> bool {
        match env
            .storage()
            .persistent()
            .get::<DataKey, Gist>(&DataKey::Gist(gist_id))
        {
            Some(gist) => env.ledger().timestamp() < gist.expires_at,
            None => false,
        }
    }

    /// Paginated list of the *active* (non-expired) gists in a location cell.
    ///
    /// `cursor` is a zero-based offset into the cell's index (not a gist id);
    /// `limit` caps the number of results returned.
    pub fn list_gists_by_cell(
        env: Env,
        location_cell: String,
        cursor: u32,
        limit: u32,
    ) -> Vec<Gist> {
        let ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::CellIndex(location_cell))
            .unwrap_or_else(|| Vec::new(&env));

        let now = env.ledger().timestamp();
        let mut results = Vec::new(&env);
        let mut count: u32 = 0;
        let mut i = cursor;

        while i < ids.len() && count < limit {
            if let Some(id) = ids.get(i) {
                if let Some(gist) = env
                    .storage()
                    .persistent()
                    .get::<DataKey, Gist>(&DataKey::Gist(id))
                {
                    if now < gist.expires_at {
                        results.push_back(gist);
                        count += 1;
                    }
                }
            }
            i += 1;
        }

        results
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Events, Ledger};
    use soroban_sdk::{Env, String};

    fn setup(env: &Env) -> GistRegistryClient<'_> {
        let contract_id = env.register(GistRegistry, ());
        GistRegistryClient::new(env, &contract_id)
    }

    fn cell(env: &Env, s: &str) -> String {
        String::from_str(env, s)
    }

    // -- posting / retrieval -------------------------------------------------

    #[test]
    fn anonymous_post_succeeds_and_is_retrievable() {
        let env = Env::default();
        let client = setup(&env);
        env.ledger().set_timestamp(1_000_000);

        let location = cell(&env, "r3gx");
        let hash = cell(&env, "QmTest123");

        let id = client.post_gist(&None, &location, &hash, &None);
        assert_eq!(id, 1);

        let gist = client.get_gist(&id).expect("gist should exist");
        assert_eq!(gist.gist_id, 1);
        assert_eq!(gist.location_cell, location);
        assert_eq!(gist.content_hash, hash);
        assert_eq!(gist.created_at, 1_000_000);
        // default TTL applied
        assert_eq!(gist.expires_at, 1_000_000 + DEFAULT_TTL_SECS);
        assert!(gist.author.is_none());
    }

    #[test]
    fn post_gist_emits_one_event() {
        let env = Env::default();
        let client = setup(&env);

        client.post_gist(&None, &cell(&env, "r3gx"), &cell(&env, "QmEvent"), &None);

        assert_eq!(env.events().all().len(), 1);
    }

    // -- signed authorship (#874) -------------------------------------------

    #[test]
    fn signed_post_records_the_author() {
        let env = Env::default();
        env.mock_all_auths();
        let client = setup(&env);

        let author = Address::generate(&env);
        let id = client.post_gist(
            &Some(author.clone()),
            &cell(&env, "r3gx"),
            &cell(&env, "QmSigned"),
            &None,
        );

        let gist = client.get_gist(&id).unwrap();
        assert_eq!(gist.author, Some(author));
    }

    #[test]
    #[should_panic]
    fn signed_post_without_authorization_is_rejected() {
        let env = Env::default();
        // NOTE: no mock_all_auths() — the required authorization is absent, so
        // require_auth must reject the call (a forged author cannot post).
        let client = setup(&env);

        let author = Address::generate(&env);
        client.post_gist(
            &Some(author),
            &cell(&env, "r3gx"),
            &cell(&env, "QmForged"),
            &None,
        );
    }

    // -- expiry (#876) -------------------------------------------------------

    #[test]
    fn gist_is_active_before_expiry_and_inactive_after() {
        let env = Env::default();
        let client = setup(&env);
        env.ledger().set_timestamp(1_000);

        let id = client.post_gist(
            &None,
            &cell(&env, "r3gx"),
            &cell(&env, "QmTtl"),
            &Some(100u64),
        );
        assert!(client.is_active(&id));

        env.ledger().set_timestamp(1_000 + 101);
        assert!(!client.is_active(&id));
        // the record itself is still retrievable
        assert!(client.get_gist(&id).is_some());
    }

    #[test]
    fn expired_gists_are_excluded_from_listings() {
        let env = Env::default();
        let client = setup(&env);
        env.ledger().set_timestamp(1_000);

        let location = cell(&env, "r3gx");
        client.post_gist(&None, &location, &cell(&env, "QmShort"), &Some(50u64));
        client.post_gist(&None, &location, &cell(&env, "QmLong"), &Some(5_000u64));

        assert_eq!(client.list_gists_by_cell(&location, &0, &10).len(), 2);

        env.ledger().set_timestamp(1_000 + 100); // first one expired
        let active = client.list_gists_by_cell(&location, &0, &10);
        assert_eq!(active.len(), 1);
        assert_eq!(active.get(0).unwrap().content_hash, cell(&env, "QmLong"));
    }

    #[test]
    fn ttl_bounds_are_enforced() {
        let env = Env::default();
        let client = setup(&env);
        let location = cell(&env, "r3gx");
        let hash = cell(&env, "QmBound");

        assert_eq!(
            client.try_post_gist(&None, &location, &hash, &Some(0u64)),
            Err(Ok(GistError::TtlZero))
        );
        assert_eq!(
            client.try_post_gist(&None, &location, &hash, &Some(MAX_TTL_SECS + 1)),
            Err(Ok(GistError::TtlTooLong))
        );
        // the upper bound itself is accepted
        assert!(client
            .try_post_gist(&None, &location, &hash, &Some(MAX_TTL_SECS))
            .is_ok());
    }

    // -- cooldown (#877) -----------------------------------------------------

    #[test]
    fn same_author_cannot_post_twice_in_a_cell_within_the_cooldown() {
        let env = Env::default();
        env.mock_all_auths();
        let client = setup(&env);
        env.ledger().set_timestamp(10_000);

        let author = Address::generate(&env);
        let location = cell(&env, "r3gx");

        client.post_gist(&Some(author.clone()), &location, &cell(&env, "Qm1"), &None);

        assert_eq!(
            client.try_post_gist(&Some(author), &location, &cell(&env, "Qm2"), &None),
            Err(Ok(GistError::CooldownActive))
        );
    }

    #[test]
    fn cooldown_expires_and_other_cells_are_unaffected() {
        let env = Env::default();
        env.mock_all_auths();
        let client = setup(&env);
        env.ledger().set_timestamp(10_000);

        let author = Address::generate(&env);
        let cell_a = cell(&env, "r3gx");
        let cell_b = cell(&env, "u4ht");

        client.post_gist(&Some(author.clone()), &cell_a, &cell(&env, "Qm1"), &None);

        // a different cell is not blocked
        assert!(client
            .try_post_gist(&Some(author.clone()), &cell_b, &cell(&env, "Qm2"), &None)
            .is_ok());

        // once the window elapses, the original cell is allowed again
        env.ledger().set_timestamp(10_000 + COOLDOWN_SECS);
        assert!(client
            .try_post_gist(&Some(author), &cell_a, &cell(&env, "Qm3"), &None)
            .is_ok());
    }

    #[test]
    fn anonymous_posts_are_not_cooldown_limited() {
        let env = Env::default();
        let client = setup(&env);
        env.ledger().set_timestamp(10_000);

        let location = cell(&env, "r3gx");
        client.post_gist(&None, &location, &cell(&env, "Qm1"), &None);
        client.post_gist(&None, &location, &cell(&env, "Qm2"), &None);

        assert_eq!(client.list_gists_by_cell(&location, &0, &10).len(), 2);
    }

    // -- cell index / pagination (#875) --------------------------------------

    #[test]
    fn listing_returns_only_the_requested_cell() {
        let env = Env::default();
        let client = setup(&env);

        let cell_a = cell(&env, "r3gx");
        let cell_b = cell(&env, "u4ht");
        let hash = cell(&env, "Qm000");

        client.post_gist(&None, &cell_a, &hash, &None);
        client.post_gist(&None, &cell_b, &hash, &None);
        client.post_gist(&None, &cell_a, &hash, &None);

        assert_eq!(client.list_gists_by_cell(&cell_a, &0, &10).len(), 2);
        assert_eq!(client.list_gists_by_cell(&cell_b, &0, &10).len(), 1);
    }

    #[test]
    fn listing_paginates_by_cursor_and_limit() {
        let env = Env::default();
        let client = setup(&env);

        let location = cell(&env, "r3gx");
        for _ in 0..5 {
            client.post_gist(&None, &location, &cell(&env, "Qm"), &None);
        }

        let page1 = client.list_gists_by_cell(&location, &0, &2);
        assert_eq!(page1.len(), 2);
        assert_eq!(page1.get(0).unwrap().gist_id, 1);
        assert_eq!(page1.get(1).unwrap().gist_id, 2);

        let page2 = client.list_gists_by_cell(&location, &2, &2);
        assert_eq!(page2.len(), 2);
        assert_eq!(page2.get(0).unwrap().gist_id, 3);

        let page3 = client.list_gists_by_cell(&location, &4, &2);
        assert_eq!(page3.len(), 1);
    }

    #[test]
    fn listing_an_unknown_cell_is_empty() {
        let env = Env::default();
        let client = setup(&env);

        assert_eq!(client.list_gists_by_cell(&cell(&env, "nope"), &0, &10).len(), 0);
    }
}
