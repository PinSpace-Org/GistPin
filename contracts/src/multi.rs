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
use soroban_sdk::{
    contracterror, contracttype, panic_with_error, symbol_short, Address, Env, Symbol, Vec,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Signers,
    Threshold,
    HighValueThreshold,
    NextTxId,
    PendingTx(u64),
    Approval(u64, Address),
    ApprovalCount(u64),
    Balance(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct PendingTx {
    pub id: u64,
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub payload: Symbol,
    pub asset: Option<Address>,
    pub created_at: u64,
    pub executed: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum MultiSigError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Unauthorized = 3,
    InvalidThreshold = 4,
    DuplicateSigner = 5,
    InvalidAmount = 6,
    PendingTxNotFound = 7,
    UnauthorizedSigner = 8,
    DuplicateApproval = 9,
    AlreadyExecuted = 10,
    InsufficientBalance = 11,
    MultisigNotConfigured = 12,
    Overflow = 13,
}

pub struct MultisigEvents;

impl MultisigEvents {
    pub fn pending_created(env: &Env, tx: &PendingTx) {
        let topics = (symbol_short!("tx"), symbol_short!("pending"), tx.id);
        env.events().publish(
            topics,
            (tx.from.clone(), tx.to.clone(), tx.amount, tx.asset.clone()),
        );
    }

    pub fn approval_recorded(
        env: &Env,
        tx_id: u64,
        signer: &Address,
        approvals_count: u32,
        threshold: u32,
    ) {
        let topics = (symbol_short!("approve"), symbol_short!("record"), tx_id);
        env.events()
            .publish(topics, (signer.clone(), approvals_count, threshold));
    }

    pub fn transaction_executed(env: &Env, tx: &PendingTx, executor: &Address) {
        let topics = (symbol_short!("tx"), symbol_short!("executed"), tx.id);
        env.events().publish(
            topics,
            (
                executor.clone(),
                tx.from.clone(),
                tx.to.clone(),
                tx.amount,
                tx.asset.clone(),
            ),
        );
    }
}

pub fn initialize_state(env: &Env, admin: Address) {
    if env.storage().instance().has(&DataKey::Admin) {
        panic_with_error!(env, MultiSigError::AlreadyInitialized);
    }

    env.storage().instance().set(&DataKey::Admin, &admin);
    env.storage()
        .instance()
        .set(&DataKey::Signers, &Vec::<Address>::new(env));
    env.storage().instance().set(&DataKey::Threshold, &0u32);
    env.storage()
        .instance()
        .set(&DataKey::HighValueThreshold, &i128::MAX);
    env.storage().instance().set(&DataKey::NextTxId, &0u64);
}

pub fn get_admin(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .unwrap_or_else(|| panic_with_error!(env, MultiSigError::NotInitialized))
}

pub fn require_admin(env: &Env, caller: &Address) {
    caller.require_auth();
    let admin = get_admin(env);
    if admin != caller.clone() {
        panic_with_error!(env, MultiSigError::Unauthorized);
    }
}

pub fn set_signers(env: &Env, caller: Address, signers: Vec<Address>, threshold: u32) {
    require_admin(env, &caller);
    validate_signer_config(env, &signers, threshold);

    env.storage().instance().set(&DataKey::Signers, &signers);
    env.storage()
        .instance()
        .set(&DataKey::Threshold, &threshold);
}

pub fn set_high_value_threshold(env: &Env, caller: Address, amount: i128) {
    require_admin(env, &caller);

    if amount < 0 {
        panic_with_error!(env, MultiSigError::InvalidAmount);
    }

    env.storage()
        .instance()
        .set(&DataKey::HighValueThreshold, &amount);
}

pub fn get_signers(env: &Env) -> Vec<Address> {
    env.storage()
        .instance()
        .get(&DataKey::Signers)
        .unwrap_or_else(|| Vec::new(env))
}

pub fn get_threshold(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::Threshold)
        .unwrap_or(0)
}

pub fn get_high_value_threshold(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::HighValueThreshold)
        .unwrap_or(i128::MAX)
}

pub fn ensure_multisig_configured(env: &Env) {
    let signers = get_signers(env);
    let threshold = get_threshold(env);

    if signers.len() == 0 || threshold == 0 || threshold > signers.len() {
        panic_with_error!(env, MultiSigError::MultisigNotConfigured);
    }
}

pub fn require_signer(env: &Env, signer: &Address) {
    if !is_signer(env, signer) {
        panic_with_error!(env, MultiSigError::UnauthorizedSigner);
    }
}

pub fn is_signer(env: &Env, signer: &Address) -> bool {
    let signers = get_signers(env);
    for configured in signers.iter() {
        if configured == signer.clone() {
            return true;
        }
    }
    false
}

pub fn next_tx_id(env: &Env) -> u64 {
    let current: u64 = env
        .storage()
        .instance()
        .get(&DataKey::NextTxId)
        .unwrap_or(0);
    let next = current
        .checked_add(1)
        .unwrap_or_else(|| panic_with_error!(env, MultiSigError::Overflow));

    env.storage().instance().set(&DataKey::NextTxId, &next);
    next
}

pub fn has_approval(env: &Env, tx_id: u64, signer: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Approval(tx_id, signer.clone()))
}

pub fn get_approval_count(env: &Env, tx_id: u64) -> u32 {
    env.storage()
        .persistent()
        .get(&DataKey::ApprovalCount(tx_id))
        .unwrap_or(0)
}

pub fn record_approval(env: &Env, tx_id: u64, signer: &Address) -> u32 {
    if has_approval(env, tx_id, signer) {
        panic_with_error!(env, MultiSigError::DuplicateApproval);
    }

    env.storage()
        .persistent()
        .set(&DataKey::Approval(tx_id, signer.clone()), &true);

    let current = get_approval_count(env, tx_id);
    let next = current
        .checked_add(1)
        .unwrap_or_else(|| panic_with_error!(env, MultiSigError::Overflow));

    env.storage()
        .persistent()
        .set(&DataKey::ApprovalCount(tx_id), &next);

    next
}

fn validate_signer_config(env: &Env, signers: &Vec<Address>, threshold: u32) {
    let signer_count = signers.len();

    if signer_count == 0 || threshold == 0 || threshold > signer_count {
        panic_with_error!(env, MultiSigError::InvalidThreshold);
    }

    for i in 0..signer_count {
        let signer_i = signers
            .get(i)
            .unwrap_or_else(|| panic_with_error!(env, MultiSigError::InvalidThreshold));

        for j in (i + 1)..signer_count {
            let signer_j = signers
                .get(j)
                .unwrap_or_else(|| panic_with_error!(env, MultiSigError::InvalidThreshold));
            if signer_i == signer_j {
                panic_with_error!(env, MultiSigError::DuplicateSigner);
            }
        }
    }
}
