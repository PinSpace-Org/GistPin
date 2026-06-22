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
  mock: boolean;
  author?: string | null;
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
    const rpcUrl = this.config.get<string>('SOROBAN_RPC_URL', 'https://soroban-testnet.stellar.org');
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

  async postGist(
    locationCell: string,
    contentHash: string,
    _author?: string,
  ): Promise<PostGistResult> {
    if (this.mockMode) {
      await this.simulateDelay();
      const gistId = String(Date.now());
      const txHash = `mock_tx_${randomBytes(16).toString('hex')}`;
      this.logger.debug(`MOCK postGist → gistId=${gistId} txHash=${txHash}`);
      return { gistId, txHash, mock: true };
    }

    return withRetry(
      async () => this.postGistLive(locationCell, contentHash, _author),
      'Soroban.postGist',
      this.maxRetries,
      this.logger,
    );
  }

  async getGist(gistId: string): Promise<GetGistResult> {
    if (this.mockMode) {
      await this.simulateDelay();
      return {
        gistId,
        locationCell: 'mock_cell',
        contentHash: `mock_Qm${randomBytes(16).toString('hex')}`,
        createdAt: Math.floor(Date.now() / 1000),
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

  private async postGistLive(
    locationCell: string,
    contentHash: string,
    author?: string,
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
        ),
      )
      .setTimeout(30)
      .build();

    const preparedTx = await rpcServer.prepareTransaction(tx);
    preparedTx.sign(signer);

    const sendResult = await rpcServer.sendTransaction(preparedTx);
    if (sendResult.status === 'ERROR') {
      throw new Error(
        `Soroban post_gist rejected: ${sendResult.errorResult?.toXDR('base64') ?? 'unknown error'}`,
      );
    }

    const txResult = await this.waitForTransaction(rpcServer, sendResult.hash);
    if (txResult.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS || !txResult.returnValue) {
      throw new Error(`Soroban post_gist did not return a successful result for ${sendResult.hash}`);
    }

    return {
      gistId: this.scValToString(txResult.returnValue),
      txHash: sendResult.hash,
      mock: false,
    };
  }

  private async getGistLive(gistId: string): Promise<GetGistResult> {
    const rpcServer = this.getRpcServer();
    const contract = this.getContract();
    const signer = this.getSigner();
    const sourceAccount = await rpcServer.getAccount(signer.publicKey());
    const tx = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        contract.call('get_gist', nativeToScVal(BigInt(gistId), { type: 'u64' })),
      )
      .setTimeout(30)
      .build();

    const simulation = await rpcServer.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(simulation) || !simulation.result) {
      throw new Error(`Soroban get_gist failed for gist ${gistId}`);
    }

    if (!simulation.result.retval) {
      throw new Error(`Soroban get_gist returned no value for gist ${gistId}`);
    }

    const native = scValToNative(simulation.result.retval);
    if (!native) {
      throw new Error(`Soroban get_gist returned null for gist ${gistId}`);
    }

    return this.normalizeGistRecord(gistId, native);
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

  private encodeOptionalAuthor(author?: string): xdr.ScVal {
    if (!author) {
      return nativeToScVal(null);
    }

    return nativeToScVal(Address.fromString(author));
  }

  private scValToString(value: xdr.ScVal): string {
    const native = scValToNative(value);
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
    if (eventName && eventName !== 'post_gist' && eventName !== 'gist_posted') {
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

  private simulateDelay(): Promise<void> {
    const ms = 100 + Math.floor(Math.random() * 200);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
