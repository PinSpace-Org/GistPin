import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc as SorobanRpc,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';
import { randomBytes } from 'crypto';

/**
 * Canonical event name emitted by the GistRegistry Soroban contract on a new
 * gist. Must match the symbol published in contracts/src/lib.rs (see
 * contracts/README.md "Events").
 */
const GIST_POSTED_EVENT = 'gist_posted';

// ── GistError codes (matches contracts/src/lib.rs GistError enum) ─────────────

export enum GistError {
  TtlZero = 1,
  TtlTooLong = 2,
  CooldownActive = 3,
  NotFound = 4,
  NotAuthorized = 5,
  AlreadyInitialized = 6,
  NotInitialized = 7,
  AnonymousImmutable = 8,
}

const GIST_ERROR_LABELS: Record<number, string> = {
  [GistError.TtlZero]: 'TtlZero',
  [GistError.TtlTooLong]: 'TtlTooLong',
  [GistError.CooldownActive]: 'CooldownActive',
  [GistError.NotFound]: 'NotFound',
  [GistError.NotAuthorized]: 'NotAuthorized',
  [GistError.AlreadyInitialized]: 'AlreadyInitialized',
  [GistError.NotInitialized]: 'NotInitialized',
  [GistError.AnonymousImmutable]: 'AnonymousImmutable',
};

/**
 * Typed error thrown when a Soroban contract call returns a GistError.
 * Callers can branch on `error.code` to distinguish between different
 * failure modes (e.g. CooldownActive vs TtlTooLong).
 */
export class GistContractError extends Error {
  constructor(
    public readonly code: GistError,
    message?: string,
  ) {
    super(message ?? GIST_ERROR_LABELS[code] ?? `GistError(${code})`);
    this.name = 'GistContractError';
  }
}

// ── Result / data types ───────────────────────────────────────────────────────

export interface PostGistResult {
  gistId: string;
  txHash: string;
  mock: boolean;
}

export interface GetGistResult {
  gistId: string;
  locationCell: string;
  contentHash: string;
  createdAt: number;
  expiresAt: number;
  hidden: boolean;
  mock: boolean;
  author?: string | null;
}

export interface IsActiveResult {
  active: boolean;
  mock: boolean;
}

export interface ListGistsByCellResult {
  gists: GetGistResult[];
  mock: boolean;
}

export interface GistEvent {
  gistId: string;
  locationCell: string;
  contentHash: string;
  author: string | null;
  ledger: number;
  createdAt: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxAttempts = 3,
  logger?: Logger,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      logger?.warn(`${label} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);
      if (attempt < maxAttempts) await sleep(200 * attempt);
    }
  }
  throw lastError;
}

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly mockMode: boolean;
  private readonly maxRetries: number;
  private readonly rpcServer: SorobanRpc.Server | null;
  private readonly contract: Contract | null;
  private readonly signer: Keypair | null;
  private readonly networkPassphrase: string;

  constructor(private readonly config: ConfigService) {
    const contractId = this.config.get<string>('CONTRACT_ID_GIST_REGISTRY') ?? '';
    const rpcUrl = this.config.get<string>(
      'SOROBAN_RPC_URL',
      'https://soroban-testnet.stellar.org',
    );
    this.mockMode = !contractId;
    this.maxRetries = this.config.get<number>('SOROBAN_RETRY_ATTEMPTS', 3);
    this.networkPassphrase = this.config.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      Networks.TESTNET,
    );
    this.rpcServer = this.mockMode ? null : new SorobanRpc.Server(rpcUrl);
    this.contract = this.mockMode ? null : new Contract(contractId);
    this.signer = this.resolveSigner();

    if (this.mockMode) {
      this.logger.warn('Soroban running in MOCK MODE — no blockchain calls will be made');
    } else if (!this.signer) {
      this.logger.warn(
        'Soroban live mode is enabled but STELLAR_SECRET_KEY is missing; write calls will fail',
      );
    }
  }

  /**
   * Post a new gist to the on-chain GistRegistry.
   *
   * Signature: `post_gist(author: Option<Address>, location_cell: String,
   *   content_hash: String, ttl_secs: Option<u64>) -> Result<u64, GistError>`
   *
   * On success, returns the gist_id. On contract error, throws a
   * {@link GistContractError} with the typed error code.
   */
  async postGist(
    author: string | null | undefined,
    locationCell: string,
    contentHash: string,
    ttlSecs?: number,
  ): Promise<PostGistResult> {
    if (this.mockMode) {
      await this.simulateDelay();
      const gistId = String(Date.now());
      const txHash = `mock_tx_${randomBytes(16).toString('hex')}`;
      this.logger.debug(`MOCK postGist → gistId=${gistId} txHash=${txHash}`);
      return { gistId, txHash, mock: true };
    }

    return withRetry(
      async () => this.postGistLive(author ?? undefined, locationCell, contentHash, ttlSecs),
      'Soroban.postGist',
      this.maxRetries,
      this.logger,
    );
  }

  /**
   * Retrieve a gist record by id.
   *
   * Expired/hidden records are still returned (use `isActive` to check
   * visibility). Returns `null` when the contract returns `None`.
   */
  async getGist(gistId: string): Promise<GetGistResult | null> {
    if (this.mockMode) {
      await this.simulateDelay();
      return {
        gistId,
        locationCell: 'mock_cell',
        contentHash: `mock_Qm${randomBytes(16).toString('hex')}`,
        createdAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
        hidden: false,
        mock: true,
      };
    }

    return withRetry(
      async () => this.getGistLive(gistId),
      'Soroban.getGist',
      this.maxRetries,
      this.logger,
    );
  }

  /**
   * Check whether a gist exists, is not expired, and is not hidden.
   *
   * On-chain: `is_active(gist_id) -> bool`
   */
  async isActive(gistId: string): Promise<IsActiveResult> {
    if (this.mockMode) {
      await this.simulateDelay();
      this.logger.debug(`MOCK isActive(${gistId}) → true`);
      return { active: true, mock: true };
    }

    return withRetry(
      async () => this.isActiveLive(gistId),
      'Soroban.isActive',
      this.maxRetries,
      this.logger,
    );
  }

  /**
   * Paginated list of **active** gists in a location cell.
   *
   * On-chain: `list_gists_by_cell(location_cell, cursor: u32, limit: u32) -> Vec<Gist>`
   *
   * `cursor` is a zero-based offset into the per-cell index (not a gist id).
   */
  async listGistsByCell(
    locationCell: string,
    cursor: number,
    limit: number,
  ): Promise<ListGistsByCellResult> {
    if (this.mockMode) {
      await this.simulateDelay();
      this.logger.debug(`MOCK listGistsByCell(${locationCell}, ${cursor}, ${limit}) → []`);
      return { gists: [], mock: true };
    }

    return withRetry(
      async () => this.listGistsByCellLive(locationCell, cursor, limit),
      'Soroban.listGistsByCell',
      this.maxRetries,
      this.logger,
    );
  }

  async getEventsSince(ledger: number): Promise<GistEvent[]> {
    if (this.mockMode) {
      this.logger.debug(`MOCK getEventsSince(${ledger}) → []`);
      return [];
    }

    return withRetry(
      async () => this.getEventsSinceLive(ledger),
      'Soroban.getEventsSince',
      this.maxRetries,
      this.logger,
    );
  }

  // ── Private: signers & guards ─────────────────────────────────────────────

  private resolveSigner(): Keypair | null {
    const secretKey = this.config.get<string>('STELLAR_SECRET_KEY') ?? '';
    if (!secretKey) {
      return null;
    }

    try {
      return Keypair.fromSecret(secretKey);
    } catch (err) {
      this.logger.warn(`Invalid STELLAR_SECRET_KEY: ${(err as Error).message}`);
      return null;
    }
  }

  private getRpcServer(): SorobanRpc.Server {
    if (!this.rpcServer) {
      throw new Error('Soroban live mode is unavailable without a contract id');
    }
    return this.rpcServer;
  }

  private getContract(): Contract {
    if (!this.contract) {
      throw new Error('Soroban live mode is unavailable without a contract id');
    }
    return this.contract;
  }

  private getSigner(): Keypair {
    if (!this.signer) {
      throw new Error('STELLAR_SECRET_KEY is required for Soroban live mode');
    }
    return this.signer;
  }

  // ── Private: live contract calls ──────────────────────────────────────────

  private async postGistLive(
    author: string | undefined,
    locationCell: string,
    contentHash: string,
    ttlSecs?: number,
  ): Promise<PostGistResult> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();
    const signer = this.getSigner();
    const sourceAccount = await rpcServer.getAccount(signer.publicKey());

    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        contract.call(
          'post_gist',
          this.encodeOptionalAuthor(author),
          nativeToScVal(locationCell),
          nativeToScVal(contentHash),
          this.encodeOptionalU64(ttlSecs),
        ),
      )
      .setTimeout(30)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(tx);
    preparedTx.sign(signer);

    const sendResult = await rpcServer.sendTransaction(preparedTx);
    if (sendResult.status === 'ERROR') {
      const errorMsg = sendResult.errorResult?.toXDR('base64') ?? 'unknown error';
      throw new Error(`Soroban post_gist rejected: ${errorMsg}`);
    }

    const txResult = await this.waitForTransaction(rpcServer, sendResult.hash);
    if (
      txResult.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS ||
      !txResult.returnValue
    ) {
      throw new Error(
        `Soroban post_gist did not return a successful result for ${sendResult.hash}`,
      );
    }

    // The return value is Result<u64, GistError>.
    // On success it unwraps to the u64 gist_id.
    const native = scValToNative(txResult.returnValue);
    const gistId = this.extractGistIdFromResult(native);

    return {
      gistId,
      txHash: sendResult.hash,
      mock: false,
    };
  }

  private async getGistLive(gistId: string): Promise<GetGistResult | null> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();

    const simulation = await rpcServer.simulateTransaction(
      new TransactionBuilder(
        await rpcServer.getAccount(this.getSigner().publicKey()),
        { fee: BASE_FEE, networkPassphrase: this.networkPassphrase },
      )
        .addOperation(
          contract.call('get_gist', nativeToScVal(BigInt(gistId), { type: 'u64' })),
        )
        .setTimeout(30)
        .build(),
    );

    if (SorobanRpc.Api.isSimulationError(simulation) || !simulation.result) {
      throw new Error(`Soroban get_gist failed for gist ${gistId}`);
    }

    if (!simulation.result.retval) {
      throw new Error(`Soroban get_gist returned no value for gist ${gistId}`);
    }

    const native = scValToNative(simulation.result.retval);
    if (!native) {
      return null;
    }

    return this.normalizeGistRecord(gistId, native);
  }

  private async isActiveLive(gistId: string): Promise<IsActiveResult> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();

    const simulation = await rpcServer.simulateTransaction(
      new TransactionBuilder(
        await rpcServer.getAccount(this.getSigner().publicKey()),
        { fee: BASE_FEE, networkPassphrase: this.networkPassphrase },
      )
        .addOperation(
          contract.call('is_active', nativeToScVal(BigInt(gistId), { type: 'u64' })),
        )
        .setTimeout(30)
        .build(),
    );

    if (SorobanRpc.Api.isSimulationError(simulation) || !simulation.result) {
      throw new Error(`Soroban is_active failed for gist ${gistId}`);
    }

    if (!simulation.result.retval) {
      throw new Error(`Soroban is_active returned no value for gist ${gistId}`);
    }

    const native = scValToNative(simulation.result.retval);
    return { active: Boolean(native), mock: false };
  }

  private async listGistsByCellLive(
    locationCell: string,
    cursor: number,
    limit: number,
  ): Promise<ListGistsByCellResult> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();

    const simulation = await rpcServer.simulateTransaction(
      new TransactionBuilder(
        await rpcServer.getAccount(this.getSigner().publicKey()),
        { fee: BASE_FEE, networkPassphrase: this.networkPassphrase },
      )
        .addOperation(
          contract.call(
            'list_gists_by_cell',
            nativeToScVal(locationCell),
            nativeToScVal(cursor, { type: 'u32' }),
            nativeToScVal(limit, { type: 'u32' }),
          ),
        )
        .setTimeout(30)
        .build(),
    );

    if (SorobanRpc.Api.isSimulationError(simulation) || !simulation.result) {
      throw new Error(`Soroban list_gists_by_cell failed for cell ${locationCell}`);
    }

    if (!simulation.result.retval) {
      throw new Error(
        `Soroban list_gists_by_cell returned no value for cell ${locationCell}`,
      );
    }

    const native = scValToNative(simulation.result.retval) as unknown[];
    if (!Array.isArray(native)) {
      throw new Error(
        `Soroban list_gists_by_cell returned non-array for cell ${locationCell}`,
      );
    }

    const gists = native.map((record, idx) =>
      this.normalizeGistRecord(String(idx), record),
    );

    return { gists, mock: false };
  }

  private async getEventsSinceLive(ledger: number): Promise<GistEvent[]> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();

    const response = await rpcServer.getEvents({
      filters: [{ type: 'contract', contractIds: [contract.contractId()] }],
      startLedger: ledger,
    });

    return response.events
      .map((event) => this.decodeGistEvent(event))
      .filter((event): event is GistEvent => event !== null);
  }

  private async waitForTransaction(
    rpcServer: SorobanRpc.Server,
    hash: string,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    const maxAttempts = Math.max(this.maxRetries * 4, 8);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const txResult = await rpcServer.getTransaction(hash);
      if (txResult.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
        return txResult;
      }

      if (attempt < maxAttempts) {
        await sleep(500 * attempt);
      }
    }

    throw new Error(`Timed out waiting for Soroban transaction ${hash}`);
  }

  // ── Private: encoding helpers ─────────────────────────────────────────────

  private encodeOptionalAuthor(author?: string): xdr.ScVal {
    if (!author) {
      return nativeToScVal(null);
    }
    return nativeToScVal(Address.fromString(author));
  }

  private encodeOptionalU64(value?: number): xdr.ScVal {
    if (value === undefined || value === null) {
      return nativeToScVal(null);
    }
    return nativeToScVal(BigInt(value), { type: 'u64' });
  }

  // ── Private: decoding / normalization ─────────────────────────────────────

  /**
   * The contract returns `Result<u64, GistError>`. When the outer wrapper is
   * a Soroban `Ok`, the inner value is the u64 gist_id. If it's an `Err`,
   * the inner value is a u32 error code.
   */
  private extractGistIdFromResult(native: unknown): string {
    if (native && typeof native === 'object') {
      const obj = native as Record<string, unknown>;
      if ('ok' in obj) {
        const val = obj.ok;
        if (typeof val === 'bigint') {
          return val.toString();
        }
        return String(val);
      }
      if ('err' in obj) {
        const code =
          typeof obj.err === 'bigint'
            ? Number(obj.err)
            : typeof obj.err === 'number'
              ? obj.err
              : Number(obj.err);
        throw new GistContractError(code as GistError);
      }
    }

    if (typeof native === 'bigint') {
      return native.toString();
    }
    return String(native);
  }

  private normalizeGistRecord(gistId: string, native: unknown): GetGistResult {
    const record = native as Record<string, unknown>;
    const normalizedGistId = this.readString(record.gist_id ?? record.gistId ?? gistId);
    const author = this.readMaybeString(record.author);

    return {
      gistId: normalizedGistId,
      locationCell: this.readString(record.location_cell ?? record.locationCell),
      contentHash: this.readString(record.content_hash ?? record.contentHash),
      createdAt: this.readNumber(record.created_at ?? record.createdAt),
      expiresAt: this.readNumber(record.expires_at ?? record.expiresAt),
      hidden: this.readBool(record.hidden),
      author,
      mock: false,
    };
  }

  private decodeGistEvent(event: SorobanRpc.Api.EventResponse): GistEvent | null {
    const topic = event.topic.map((value) => scValToNative(value));
    if (topic.length === 0) {
      return null;
    }

    const eventName = typeof topic[0] === 'string' ? topic[0] : '';
    if (eventName !== GIST_POSTED_EVENT) {
      return null;
    }

    const payload = scValToNative(event.value) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return {
      gistId: this.readString(payload.gist_id ?? payload.gistId),
      locationCell: this.readString(payload.location_cell ?? payload.locationCell),
      contentHash: this.readString(payload.content_hash ?? payload.contentHash),
      author: this.readMaybeString(payload.author),
      ledger: event.ledger,
      createdAt: this.readNumber(payload.created_at ?? payload.createdAt ?? event.ledger),
    };
  }

  private readString(value: unknown): string {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      return String(value);
    }

    throw new Error('Soroban response was missing a required string field');
  }

  private readMaybeString(value: unknown): string | null {
    if (value == null) {
      return null;
    }

    return this.readString(value);
  }

  private readNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Soroban response was missing a required numeric field');
    }

    return parsed;
  }

  private readBool(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'bigint') {
      return value !== 0n;
    }
    return Boolean(value);
  }

  private simulateDelay(): Promise<void> {
    const ms = 100 + Math.floor(Math.random() * 200);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
