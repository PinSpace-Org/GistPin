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
