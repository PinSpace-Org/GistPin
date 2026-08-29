/**
 * Predictive analytics suite for the GistPin platform.
 *
 * Consolidates the four forecasting engines behind the Stellar Wave batch:
 *  - platform value density mapping (per geohash cell)
 *  - API deprecation impact prediction
 *  - content influence propagation modeling
 *  - platform uptime trend forecasting
 */

const VALUE_TIPS_WEIGHT = 2;
const SLA_TARGET = 99.9;

export interface CellSample {
  /** Geohash-like cell identifier. */
  id: string;
  /** Longitude of the cell centroid (degrees). */
  lng: number;
  /** Latitude of the cell centroid (degrees). */
  lat: number;
  /** Reaction count within the cell. */
  reactions: number;
  /** Tip count within the cell. */
  tips: number;
  /** ISO timestamp of the first activity seen in the cell. */
  createdAt: string;
}

export interface ValueDensityRow {
  cell: string;
  reactions: number;
  tips: number;
  valueScore: number;
  highValue: boolean;
  /** Raw score change vs the previous observation window. */
  migration: number;
}

export interface EndpointSample {
  id: string;
  /** Average successful calls per day against the endpoint. */
  usagePerDay: number;
}

export interface ConsumerSample {
  id: string;
  /** Endpoint ids this consumer depends on. */
  dependsOn: string[];
  /** Estimated person-days to migrate off the endpoint. */
  migrationEstimate: number;
}

export interface DeprecationImpactRow {
  endpoint: string;
  consumers: number;
  usagePerDay: number;
  migrationEffort: number;
  impactScore: number;
  /** Teams that should receive the deprecation communication. */
  planRecipients: string[];
}

export interface GistSample {
  gistId: string;
  /** Home cell of the gist. */
  cellId: string;
  /** Base influence of the gist, 0-100. */
  baseInfluence: number;
}

export interface InfluenceRow {
  gist: string;
  /** Cells the influence reached (truncated for display). */
  reachedCells: string;
  influence: number;
  radius: number;
}

export interface UptimeSample {
  label: string;
  /** Measured availability (0-100) for the period. */
  availability: number;
}

export interface DeploymentSample {
  label: string;
  /** True when a deployment was pushed in the period. */
  applied: boolean;
}

export interface UptimeForecastPoint {
  label: string;
  availability: number | null;
  forecast: number | null;
  slaBreachProbability: number;
}

export interface PredictiveSuiteData {
  density: ValueDensityRow[];
  deprecations: DeprecationImpactRow[];
  influencers: InfluenceRow[];
  uptime: UptimeForecastPoint[];
}

/**
 * Value score per geohash cell. The score blends reaction and tip volume; the
 * longevity component (age of the cell) is surfaced on the row for trend
 * purposes. Scores are normalized to 0-100 against the hottest cell.
 */
export function computeValueDensity(
  cells: CellSample[],
  previous: ReadonlyMap<string, CellSample> = new Map()
): ValueDensityRow[] {
  const scored = cells.map((cell) => {
    const raw = cell.reactions + cell.tips * VALUE_TIPS_WEIGHT;
    return { cell, raw };
  });

  const maxRaw = Math.max(1, ...scored.map((s) => s.raw));

  const rows = scored.map(({ cell, raw }) => {
    const valueScore = Math.round((raw / maxRaw) * 100);
    const prior = previous.get(cell.id) ?? cell;
    const migration = Math.round(raw - (prior.reactions + prior.tips * VALUE_TIPS_WEIGHT));
    return { cell: cell.id, reactions: cell.reactions, tips: cell.tips, valueScore, migration, highValue: false };
  });

  const mean = rows.reduce((sum, r) => sum + r.valueScore, 0) / Math.max(1, rows.length);
  for (const row of rows) {
    row.highValue = row.valueScore >= mean;
  }
  return rows;
}

/**
 * Impact score for deprecating each endpoint. Usage frequency is combined with
 * the migration effort of every affected consumer, then normalized against the
 * consumer base. Plan recipients are derived from the consumer dependency map.
 */
export function computeDeprecationImpact(
  endpoints: EndpointSample[],
  consumers: ConsumerSample[]
): DeprecationImpactRow[] {
  return endpoints.map((endpoint) => {
    const affected = consumers.filter((c) => c.dependsOn.includes(endpoint.id));
    const effort = affected.reduce((sum, c) => sum + c.migrationEstimate, 0);
    const usage = endpoint.usagePerDay;
    const impactScore = Math.min(100, Math.round((usage * effort) / Math.max(1, consumers.length) / 10));
    const planRecipients = consumers.filter((c) => !c.dependsOn.includes(endpoint.id)).map((c) => c.id);
    return {
      endpoint: endpoint.id,
      consumers: affected.length,
      usagePerDay: usage,
      migrationEffort: effort,
      impactScore,
      planRecipients,
    };
  });
}

/**
 * Influence from a base gist decays across neighboring geohash cells inside
 * its radius. The top-influence gists are ranked so propagation-heavy content
 * can be surfaced on the network visualization.
 */
export function computeInfluence(
  gists: GistSample[],
  cells: CellSample[],
  radiusKm = 5,
  top = 5
): InfluenceRow[] {
  const cellPos = new Map(cells.map((c) => [c.id, c]));
  const tracked: InfluenceRow[] = [];

  for (const gist of gists) {
    const origin = cellPos.get(gist.cellId);
    if (!origin) continue;

    let total = 0;
    const reached: string[] = [];
    for (const cell of cells) {
      const distance = Math.hypot(cell.lat - origin.lat, cell.lng - origin.lng);
      if (distance <= radiusKm) {
        const decay = Math.exp(-distance / radiusKm);
        total += gist.baseInfluence * decay;
        reached.push(cell.id);
      }
    }

    tracked.push({
      gist: gist.gistId,
      reachedCells: reached.join(', ').slice(0, 60),
      influence: Math.round(total),
      radius: radiusKm,
    });
  }

  return tracked.sort((a, b) => a.influence - b.influence).slice(0, top);
}

/**
 * Straight-line extrapolation of measured uptime. The forecast is anchored to
 * the historical mean and pulled forward over the horizon; deployment periods
 * aggravate the SLA breach probability estimate.
 */
export function forecastUptime(
  history: UptimeSample[],
  deployments: DeploymentSample[],
  horizon = 12
): UptimeForecastPoint[] {
  if (history.length === 0) return [];

  const mean = history.reduce((sum, h) => sum + h.availability, 0) / history.length;
  const first = history[0].availability;
  const last = history[history.length - 1].availability;
  const slope = history.length > 1 ? (last - first) / (history.length - 1) : 0;

  const points: UptimeForecastPoint[] = history.map((h) => ({
    label: h.label,
    availability: h.availability,
    forecast: null,
    slaBreachProbability: 0,
  }));

  const breached = history.filter((h) => h.availability < SLA_TARGET).length;
  for (let i = 1; i <= horizon; i++) {
    const forecast = Math.min(100, Math.max(0, mean + slope * i));
    const probability = Math.min(
      100,
      Math.round(((breached / Math.max(1, history.length)) * 100) + deployments.filter((d) => d.applied).length * 7)
    );
    points.push({
      label: `+${i}w`,
      availability: null,
      forecast,
      slaBreachProbability: probability,
    });
  }

  return points;
}

/**
 * Sample dataset wiring all four engines together so the dashboard renders a
 * deterministic suite of forecasts on load.
 */
export function generatePredictiveSuiteData(): PredictiveSuiteData {
  const cells: CellSample[] = [
    { id: 'ab12', lng: 3.7, lat: 6.5, reactions: 142, tips: 31, createdAt: '2025-11-02T09:00:00Z' },
    { id: 'cd34', lng: 4.1, lat: 6.6, reactions: 98, tips: 12, createdAt: '2025-11-14T09:00:00Z' },
    { id: 'ef56', lng: 3.9, lat: 6.4, reactions: 55, tips: 8, createdAt: '2025-11-21T09:00:00Z' },
    { id: 'gh78', lng: 3.5, lat: 6.7, reactions: 210, tips: 44, createdAt: '2025-11-05T09:00:00Z' },
    { id: 'ij90', lng: 4.3, lat: 6.3, reactions: 34, tips: 2, createdAt: '2025-12-01T09:00:00Z' },
  ];

  const endpoints: EndpointSample[] = [
    { id: 'POST /gists', usagePerDay: 18400 },
    { id: 'GET /gists/:id/reactions', usagePerDay: 9320 },
    { id: 'POST /gists/:id/tips', usagePerDay: 4115 },
    { id: 'GET /geohash/:cell/nearby', usagePerDay: 26050 },
  ];

  const consumers: ConsumerSample[] = [
    { id: 'mobile-app', dependsOn: ['POST /gists', 'GET /geohash/:cell/nearby'], migrationEstimate: 9 },
    { id: 'web-dashboard', dependsOn: ['GET /gists/:id/reactions'], migrationEstimate: 3 },
    { id: 'explorer-client', dependsOn: ['POST /gists', 'GET /gists/:id/reactions', 'GET /geohash/:cell/nearby'], migrationEstimate: 14 },
    { id: 'tipping-bot', dependsOn: ['POST /gists/:id/tips'], migrationEstimate: 2 },
    { id: 'archive-service', dependsOn: ['GET /geohash/:cell/nearby'], migrationEstimate: 6 },
  ];

  const gists: GistSample[] = [
    { gistId: 'g-1042', cellId: 'gh78', baseInfluence: 84 },
    { gistId: 'g-1001', cellId: 'ab12', baseInfluence: 61 },
    { gistId: 'g-1077', cellId: 'cd34', baseInfluence: 47 },
    { gistId: 'g-1088', cellId: 'ij90', baseInfluence: 22 },
    { gistId: 'g-1055', cellId: 'ef56', baseInfluence: 38 },
  ];

  const uptime: UptimeSample[] = [
    { label: 'w1', availability: 99.98 },
    { label: 'w2', availability: 99.95 },
    { label: 'w3', availability: 99.47 },
    { label: 'w4', availability: 98.9 },
    { label: 'w5', availability: 99.3 },
    { label: 'w6', availability: 99.7 },
  ];

  const deployments: DeploymentSample[] = [
    { label: 'w3', applied: true },
    { label: 'w4', applied: true },
    { label: 'w6', applied: true },
  ];

  return {
    density: computeValueDensity(cells),
    deprecations: computeDeprecationImpact(endpoints, consumers),
    influencers: computeInfluence(gists, cells),
    uptime: forecastUptime(uptime, deployments),
  };
}