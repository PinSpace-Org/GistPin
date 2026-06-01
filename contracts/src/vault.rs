#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

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
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const GIST_COUNT: soroban_sdk::Symbol = symbol_short!("GCOUNT");

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct GistRegistry;

#[contractimpl]
impl GistRegistry {
    /// Register a new gist on-chain. Returns the assigned gist_id.
    pub fn post_gist(
        env: Env,
        author: Option<Address>,
        location_cell: String,
        content_hash: String,
    ) -> u64 {
        let gist_id: u64 = env.storage().instance().get(&GIST_COUNT).unwrap_or(0) + 1;

        let gist = Gist {
            gist_id,
            author,
            location_cell: location_cell.clone(),
            content_hash,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&gist_id, &gist);
        env.storage().instance().set(&GIST_COUNT, &gist_id);

        gist_id
    }

    /// Retrieve a gist record by its id.
    pub fn get_gist(env: Env, gist_id: u64) -> Option<Gist> {
        env.storage().persistent().get(&gist_id)
    }

    /// List gists whose location_cell matches the given cell string.
    /// `cursor` is the gist_id to start scanning from (inclusive); `limit` caps results.
    pub fn list_gists_by_cell(
        env: Env,
        location_cell: String,
        cursor: u64,
        limit: u32,
    ) -> Vec<Gist> {
        let total: u64 = env.storage().instance().get(&GIST_COUNT).unwrap_or(0);
        let mut results = Vec::new(&env);
        let mut count: u32 = 0;

        let start = if cursor == 0 { 1 } else { cursor };

        for id in start..=total {
            if count >= limit {
                break;
            }
            if let Some(gist) = env.storage().persistent().get::<u64, Gist>(&id) {
                if gist.location_cell == location_cell {
                    results.push_back(gist);
                    count += 1;
                }
            }
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
    use soroban_sdk::testutils::Ledger;
    use soroban_sdk::{Env, String};

    #[test]
    fn test_post_and_get_gist() {
        let env = Env::default();
        let contract_id = env.register(GistRegistry, ());
        let client = GistRegistryClient::new(&env, &contract_id);

        env.ledger().set_timestamp(1_000_000);

        let location = String::from_str(&env, "r3gx");
        let hash = String::from_str(&env, "QmTest123");

        let id = client.post_gist(&None, &location, &hash);
        assert_eq!(id, 1);

        let gist = client.get_gist(&id).expect("gist should exist");
        assert_eq!(gist.gist_id, 1);
        assert_eq!(gist.location_cell, location);
        assert_eq!(gist.content_hash, hash);
        assert_eq!(gist.created_at, 1_000_000);
    }

    #[test]
    fn test_list_gists_by_cell() {
        let env = Env::default();
        let contract_id = env.register(GistRegistry, ());
        let client = GistRegistryClient::new(&env, &contract_id);

        let cell_a = String::from_str(&env, "r3gx");
        let cell_b = String::from_str(&env, "u4ht");
        let hash = String::from_str(&env, "Qm000");

        client.post_gist(&None, &cell_a, &hash);
        client.post_gist(&None, &cell_b, &hash);
        client.post_gist(&None, &cell_a, &hash);

        let results = client.list_gists_by_cell(&cell_a, &0, &10);
        assert_eq!(results.len(), 2);
    }
}
