/**
 * Geohash encode/decode/bounds/neighbours utilities (precision 1-9), with
 * no runtime dependencies. Matches the standard base32 geohash algorithm
 * the backend's `location_cell` column already uses.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_INDEX: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) BASE32_INDEX[BASE32[i]] = i;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeohashBounds {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface GeohashNeighbours {
  n: string;
  s: string;
  e: string;
  w: string;
  ne: string;
  nw: string;
  se: string;
  sw: string;
}

/** Encode a lat/lon pair into a geohash of the given precision (1-9). */
export function encode(lat: number, lon: number, precision = 7): string {
  let latRange: [number, number] = [-90, 90];
  let lonRange: [number, number] = [-180, 180];
  let hash = '';
  let bit = 0;
  let bitCount = 0;
  let even = true;

  while (hash.length < precision) {
    if (even) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (lon >= mid) {
        bit = (bit << 1) | 1;
        lonRange[0] = mid;
      } else {
        bit = bit << 1;
        lonRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (lat >= mid) {
        bit = (bit << 1) | 1;
        latRange[0] = mid;
      } else {
        bit = bit << 1;
        latRange[1] = mid;
      }
    }
    even = !even;

    if (++bitCount === 5) {
      hash += BASE32[bit];
      bitCount = 0;
      bit = 0;
    }
  }

  return hash;
}

/** Decode a geohash to the centre point of its cell. */
export function decode(hash: string): LatLon {
  const { minLat, maxLat, minLon, maxLon } = bounds(hash);
  return { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 };
}

/** The bounding box a geohash cell covers. */
export function bounds(hash: string): GeohashBounds {
  let latRange: [number, number] = [-90, 90];
  let lonRange: [number, number] = [-180, 180];
  let even = true;

  for (const char of hash.toLowerCase()) {
    const index = BASE32_INDEX[char];
    if (index === undefined) throw new Error(`Invalid geohash character: "${char}"`);

    for (let bitPosition = 4; bitPosition >= 0; bitPosition--) {
      const bit = (index >> bitPosition) & 1;
      if (even) {
        const mid = (lonRange[0] + lonRange[1]) / 2;
        if (bit === 1) lonRange[0] = mid;
        else lonRange[1] = mid;
      } else {
        const mid = (latRange[0] + latRange[1]) / 2;
        if (bit === 1) latRange[0] = mid;
        else latRange[1] = mid;
      }
      even = !even;
    }
  }

  return { minLat: latRange[0], maxLat: latRange[1], minLon: lonRange[0], maxLon: lonRange[1] };
}

/** Roll a geohash up to a coarser (shorter) precision. No-op if already <= precision. */
export function truncate(hash: string, precision: number): string {
  return hash.slice(0, Math.max(0, precision));
}

function clampLat(lat: number): number {
  return Math.min(90, Math.max(-90, lat));
}

function wrapLon(lon: number): number {
  // Wrap into [-180, 180) so the antimeridian doesn't produce an invalid
  // encode() input.
  let wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180) wrapped = 180;
  return wrapped;
}

/** The eight geohash cells adjacent to `hash`, at the same precision. */
export function neighbours(hash: string): GeohashNeighbours {
  const precision = hash.length;
  const { minLat, maxLat, minLon, maxLon } = bounds(hash);
  const latStep = maxLat - minLat;
  const lonStep = maxLon - minLon;
  const { lat, lon } = decode(hash);

  const at = (dLat: number, dLon: number) =>
    encode(clampLat(lat + dLat * latStep), wrapLon(lon + dLon * lonStep), precision);

  return {
    n: at(1, 0),
    s: at(-1, 0),
    e: at(0, 1),
    w: at(0, -1),
    ne: at(1, 1),
    nw: at(1, -1),
    se: at(-1, 1),
    sw: at(-1, -1),
  };
}
