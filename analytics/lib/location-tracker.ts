export interface LocationDiscovery {
  id: string;
  name: string;
  country: string;
  region: string;
  discoveredAt: string;
  totalGists: number;
  activeUsers: number;
  lat: number;
  lng: number;
}

export interface DiscoveryMilestone {
  count: number;
  city: string;
  country: string;
  date: string;
  message: string;
}

export interface RegionStats {
  region: string;
  totalLocations: number;
  newThisMonth: number;
  growthRate: number;
  coveragePct: number;
}

export const MOCK_DISCOVERIES: LocationDiscovery[] = [
  { id: 'loc-1', name: 'San Francisco', country: 'US', region: 'North America', discoveredAt: '2025-01-15', totalGists: 4200, activeUsers: 890, lat: 37.77, lng: -122.42 },
  { id: 'loc-2', name: 'London', country: 'UK', region: 'Europe', discoveredAt: '2025-02-03', totalGists: 3800, activeUsers: 720, lat: 51.51, lng: -0.13 },
  { id: 'loc-3', name: 'Tokyo', country: 'JP', region: 'Asia', discoveredAt: '2025-02-18', totalGists: 2900, activeUsers: 610, lat: 35.68, lng: 139.69 },
  { id: 'loc-4', name: 'Berlin', country: 'DE', region: 'Europe', discoveredAt: '2025-03-01', totalGists: 2100, activeUsers: 480, lat: 52.52, lng: 13.41 },
  { id: 'loc-5', name: 'Nairobi', country: 'KE', region: 'Africa', discoveredAt: '2025-03-12', totalGists: 1400, activeUsers: 320, lat: -1.29, lng: 36.82 },
  { id: 'loc-6', name: 'São Paulo', country: 'BR', region: 'South America', discoveredAt: '2025-03-28', totalGists: 1800, activeUsers: 410, lat: -23.55, lng: -46.63 },
  { id: 'loc-7', name: 'Mumbai', country: 'IN', region: 'Asia', discoveredAt: '2025-04-05', totalGists: 2400, activeUsers: 550, lat: 19.08, lng: 72.88 },
  { id: 'loc-8', name: 'Sydney', country: 'AU', region: 'Oceania', discoveredAt: '2025-04-20', totalGists: 1600, activeUsers: 380, lat: -33.87, lng: 151.21 },
  { id: 'loc-9', name: 'Seoul', country: 'KR', region: 'Asia', discoveredAt: '2025-05-02', totalGists: 2200, activeUsers: 500, lat: 37.57, lng: 126.98 },
  { id: 'loc-10', name: 'Toronto', country: 'CA', region: 'North America', discoveredAt: '2025-05-15', totalGists: 1900, activeUsers: 430, lat: 43.65, lng: -79.38 },
  { id: 'loc-11', name: 'Lagos', country: 'NG', region: 'Africa', discoveredAt: '2025-05-28', totalGists: 980, activeUsers: 240, lat: 6.52, lng: 3.38 },
  { id: 'loc-12', name: 'Mexico City', country: 'MX', region: 'North America', discoveredAt: '2025-06-10', totalGists: 1100, activeUsers: 290, lat: 19.43, lng: -99.13 },
];

export const MILESTONES: DiscoveryMilestone[] = [
  { count: 100, city: 'San Francisco', country: 'US', date: '2025-01-15', message: '100th city discovered! The journey begins.' },
  { count: 250, city: 'Nairobi', country: 'KE', date: '2025-03-12', message: '250 cities strong — Africa fully represented.' },
  { count: 500, city: 'Seoul', country: 'KR', date: '2025-05-02', message: '500 cities! Asia leading discovery growth.' },
  { count: 1000, city: 'Mexico City', country: 'MX', date: '2025-06-10', message: '1000 cities milestone — global coverage expanding.' },
];

export const REGION_STATS: RegionStats[] = [
  { region: 'North America', totalLocations: 320, newThisMonth: 18, growthRate: 5.2, coveragePct: 82 },
  { region: 'Europe', totalLocations: 280, newThisMonth: 12, growthRate: 4.1, coveragePct: 76 },
  { region: 'Asia', totalLocations: 410, newThisMonth: 32, growthRate: 8.5, coveragePct: 68 },
  { region: 'South America', totalLocations: 180, newThisMonth: 15, growthRate: 7.8, coveragePct: 54 },
  { region: 'Africa', totalLocations: 220, newThisMonth: 28, growthRate: 12.1, coveragePct: 48 },
  { region: 'Oceania', totalLocations: 95, newThisMonth: 8, growthRate: 6.3, coveragePct: 72 },
];

export const DISCOVERY_TIMELINE = [
  { month: 'Jan', count: 85 },
  { month: 'Feb', count: 112 },
  { month: 'Mar', count: 145 },
  { month: 'Apr', count: 168 },
  { month: 'May', count: 195 },
  { month: 'Jun', count: 105 },
];

export function getDiscoveryVelocity(): { week: string; newLocations: number }[] {
  return [
    { week: 'W1 Jun', newLocations: 22 },
    { week: 'W2 Jun', newLocations: 18 },
    { week: 'W3 Jun', newLocations: 31 },
    { week: 'W4 Jun', newLocations: 15 },
    { week: 'W1 Jul', newLocations: 28 },
    { week: 'W2 Jul', newLocations: 12 },
    { week: 'W3 Jul', newLocations: 20 },
    { week: 'W4 Jul', newLocations: 25 },
  ];
}

export function getTotalLocations(): number {
  return MOCK_DISCOVERIES.length * 85 + 120;
}

export function getCoveragePercentage(): number {
  const totalPossible = 1600;
  return Math.round((getTotalLocations() / totalPossible) * 100);
}
