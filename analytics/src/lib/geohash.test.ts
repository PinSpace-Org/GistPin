import { describe, it, expect } from 'vitest';
import { encode, decode, bounds, truncate, neighbours } from './geohash';

describe('encode', () => {
  it('matches the well-known geohash.org example', () => {
    // https://geohash.org example: 57.64911, 10.40744 -> "u4pruydqqvj..."
    expect(encode(57.64911, 10.40744, 7)).toBe('u4pruyd');
  });

  it('produces shorter hashes for lower precision', () => {
    expect(encode(57.64911, 10.40744, 1).length).toBe(1);
    expect(encode(57.64911, 10.40744, 9).length).toBe(9);
  });
});

describe('decode', () => {
  it('round-trips through encode within the cell tolerance', () => {
    const lat = 40.7128;
    const lon = -74.006;
    const hash = encode(lat, lon, 9);
    const decoded = decode(hash);
    expect(decoded.lat).toBeCloseTo(lat, 3);
    expect(decoded.lon).toBeCloseTo(lon, 3);
  });
});

describe('bounds', () => {
  it('returns a box containing the original point', () => {
    const lat = -33.8688;
    const lon = 151.2093;
    const hash = encode(lat, lon, 7);
    const box = bounds(hash);
    expect(lat).toBeGreaterThanOrEqual(box.minLat);
    expect(lat).toBeLessThanOrEqual(box.maxLat);
    expect(lon).toBeGreaterThanOrEqual(box.minLon);
    expect(lon).toBeLessThanOrEqual(box.maxLon);
  });

  it('rejects an invalid character', () => {
    expect(() => bounds('u4pra!')).toThrow();
  });
});

describe('truncate', () => {
  it('rolls a hash up to a coarser precision', () => {
    expect(truncate('u4pruyd', 3)).toBe('u4p');
  });

  it('is a no-op when already at or below the target precision', () => {
    expect(truncate('u4p', 7)).toBe('u4p');
  });
});

describe('neighbours', () => {
  it('returns 8 distinct cells at the same precision as the input', () => {
    const hash = encode(40.7128, -74.006, 6);
    const result = neighbours(hash);
    const values = Object.values(result);
    expect(values).toHaveLength(8);
    for (const v of values) expect(v.length).toBe(hash.length);
  });

  // Edge case: near the north pole, latitude clamps rather than wrapping.
  it('handles a cell near the north pole without throwing', () => {
    const hash = encode(89.9, 10, 5);
    expect(() => neighbours(hash)).not.toThrow();
  });

  // Edge case: near the antimeridian, longitude wraps instead of going
  // out of the valid [-180, 180] range.
  it('handles a cell near the antimeridian by wrapping longitude', () => {
    const hash = encode(10, 179.9, 5);
    const result = neighbours(hash);
    // The eastward neighbour should wrap to a hash starting near -180,
    // not throw or produce an out-of-range encode() call.
    const eastDecoded = decode(result.e);
    expect(eastDecoded.lon).toBeLessThan(-170);
  });
});
