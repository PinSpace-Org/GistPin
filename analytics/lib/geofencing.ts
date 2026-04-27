export interface LatLng {
  lat: number;
  lng: number;
}

export interface GeoRegion {
  id: string;
  name: string;
  polygon: LatLng[];
}

export interface GistPoint {
  id: string;
  lat: number;
  lng: number;
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

/** Ray-casting point-in-polygon test. */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { lat: py, lng: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: iy, lng: ix } = polygon[i];
    const { lat: jy, lng: jx } = polygon[j];
    if (iy > py !== jy > py && px < ((jx - ix) * (py - iy)) / (jy - iy) + ix) {
      inside = !inside;
    }
  }
  return inside;
}

export function filterGistsInRegion(gists: GistPoint[], polygon: LatLng[]): GistPoint[] {
  return gists.filter((g) => pointInPolygon({ lat: g.lat, lng: g.lng }, polygon));
}

export interface RegionStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
}

export function computeRegionStats(gists: GistPoint[]): RegionStats {
  return gists.reduce<RegionStats>(
    (acc, g) => {
      acc.total++;
      acc[g.sentiment]++;
      return acc;
    },
    { total: 0, positive: 0, negative: 0, neutral: 0 },
  );
}

const STORAGE_KEY = 'gistpin-geo-regions';

export function loadRegions(): GeoRegion[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]') as GeoRegion[];
  } catch {
    return [];
  }
}

export function saveRegions(regions: GeoRegion[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(regions));
}
