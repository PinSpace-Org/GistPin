export interface Gist {
  id: string;
  content: string;
  location_cell: string | null;
  content_hash: string | null;
  stellar_gist_id: string | null;
  tx_hash: string | null;
  author_address: string | null;
  created_at: string;
  expires_at: string;
  hidden: boolean;
  report_count: number;
  is_active: boolean;
  lat?: number;
  lon?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    count: number;
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface QueryGistsParams {
  lat: number;
  lon: number;
  radius?: number;
  limit?: number;
  cursor?: string;
  authorAddress?: string;
}

export interface CountNearbyParams {
  lat: number;
  lon: number;
  radius?: number;
  breakdown?: boolean;
}

export interface CountNearbyResult {
  count: number;
  radius: number;
  lat: number;
  lon: number;
  breakdown?: Array<{ location_cell: string; count: number }>;
}

export interface ModeratorResponse {
  moderatorAddress: string | null;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: { status: 'ok' | 'error'; message?: string };
    postgis: { status: 'ok' | 'error'; message?: string };
  };
}

export interface QueryTimeseriesParams {
  from: string;
  to: string;
  bucket: 'hour' | 'day';
}

export interface TimeseriesBucket {
  bucket: string;
  count: number;
  signed: number;
  anonymous: number;
}

export interface AuthorsTopResponse {
  authors: Array<{
    address: string;
    postCount: number;
  }>;
}

export interface AuthorsTimeseriesParams {
  from: string;
  to: string;
  bucket: 'hour' | 'day';
}

export interface AuthorsTimeseriesResponse {
  buckets: Array<{
    bucket: string;
    uniqueAuthors: number;
  }>;
}

export interface EventsStatsParams {
  from: string;
  to: string;
  bucket: 'hour' | 'day';
  type?: string;
  recentLimit?: number;
}

export interface EventsStatsResponse {
  buckets: Array<{
    bucket: string;
    counts: Record<string, number>;
  }>;
  recent: Array<{
    type: string;
    ledger: number;
    stellarGistId: string | null;
    observedAt: string;
  }>;
}

export interface ModerationStatsParams {
  limit?: number;
}

export interface ModerationStatsResponse {
  hiddenCount: number;
  reportedCount: number;
  totalReports: number;
  histogram: Array<{
    bucket: string;
    count: number;
  }>;
  topReported: Array<{
    id: string;
    reportCount: number;
    hidden: boolean;
  }>;
}

export interface OverviewResponse {
  total: number;
  active: number;
  expired: number;
  hidden: number;
  uniqueAuthors: number;
  signed: number;
  anonymous: number;
  apiSubmitted: number;
  indexedOnly: number;
  totalReports: number;
}
