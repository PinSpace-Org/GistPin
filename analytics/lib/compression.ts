import pako from 'pako';

const COMPRESSION_THRESHOLD_BYTES = 100_000;

export interface CompressedPayload {
  compressed: true;
  data: number[];
  originalSize: number;
  compressedSize: number;
  ratio: number;
}

export interface UncompressedPayload {
  compressed: false;
  data: string;
}

export type DataPayload = CompressedPayload | UncompressedPayload;

export async function compressIfLarge<T>(value: T): Promise<DataPayload> {
  const json = JSON.stringify(value);
  const originalSize = new TextEncoder().encode(json).length;

  if (originalSize < COMPRESSION_THRESHOLD_BYTES) {
    return { compressed: false, data: json };
  }

  const bytes = pako.gzip(json);
  const ratio = parseFloat(((1 - bytes.length / originalSize) * 100).toFixed(1));

  return {
    compressed: true,
    data: Array.from(bytes),
    originalSize,
    compressedSize: bytes.length,
    ratio,
  };
}

export async function decompressPayload<T>(payload: DataPayload): Promise<T> {
  if (!payload.compressed) return JSON.parse(payload.data) as T;
  const json = pako.ungzip(new Uint8Array(payload.data), { to: 'string' });
  return JSON.parse(json) as T;
}

export async function processLargeDataset<T>(
  value: T,
): Promise<{ value: T; compressionInfo: string | null }> {
  const payload = await compressIfLarge(value);
  if (!payload.compressed) return { value, compressionInfo: null };
  const restored = await decompressPayload<T>(payload);
  const info = `Compressed ${(payload.originalSize / 1024).toFixed(1)} KB → ${(payload.compressedSize / 1024).toFixed(1)} KB (${payload.ratio}% saved)`;
  return { value: restored, compressionInfo: info };
}
