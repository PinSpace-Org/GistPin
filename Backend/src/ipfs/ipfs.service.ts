import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

export interface PinResult {
  cid: string;
  mock: boolean;
}

const PINATA_PIN_JSON_URL = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

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
      if (attempt < maxAttempts) await sleep(500);
    }
  }
  throw lastError;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);
  private readonly devMode: boolean;
  private readonly maxRetries: number;
  private readonly gateway: string;

  private readonly apiKey?: string;
  private readonly secretKey?: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('PINATA_API_KEY');
    const secretKey = this.config.get<string>('PINATA_SECRET_KEY');
    this.maxRetries = this.config.get<number>('IPFS_RETRY_ATTEMPTS', 3);
    this.gateway = this.config.get<string>('ipfs.gateway', 'https://gateway.pinata.cloud/ipfs');
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.devMode = !apiKey || !secretKey;

    if (this.devMode) {
      this.logger.warn('IPFS running in DEV MODE — mock CIDs will be generated');
    }
  }

  async pinJson(content: Record<string, unknown>): Promise<PinResult> {
    if (this.devMode) return this.mockPin(content);

    return withRetry(
      async () => {
        // Pinata REST API (replaces the @pinata/sdk dependency).
        const res = await fetch(PINATA_PIN_JSON_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            pinata_api_key: this.apiKey as string,
            pinata_secret_api_key: this.secretKey as string,
          },
          body: JSON.stringify({
            pinataContent: content,
            pinataMetadata: { name: `gist-${Date.now()}` },
          }),
        });
        if (!res.ok) throw new Error(`Pinata pinJSONToIPFS failed: ${res.status}`);
        const result = (await res.json()) as { IpfsHash?: string };
        if (!result.IpfsHash) throw new Error('Pinata response did not include IpfsHash');
        return { cid: result.IpfsHash, mock: false };
      },
      'IPFS.pinJson',
      this.maxRetries,
      this.logger,
    );
  }

  async getJson(cid: string): Promise<Record<string, unknown>> {
    if (this.devMode || cid.startsWith('mock_')) {
      return { cid, mock: true, retrieved_at: new Date().toISOString() };
    }

    return withRetry(
      async () => {
        const url = `${this.gateway}/${cid}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);
        return res.json() as Promise<Record<string, unknown>>;
      },
      'IPFS.getJson',
      this.maxRetries,
      this.logger,
    );
  }

  private mockPin(content: Record<string, unknown>): PinResult {
    const hash = createHash('sha256')
      .update(JSON.stringify(content) + randomBytes(4).toString('hex'))
      .digest('hex')
      .slice(0, 32);
    const cid = `mock_Qm${hash}`;
    this.logger.debug(`DEV MODE: mock CID ${cid}`);
    return { cid, mock: true };
  }
}
