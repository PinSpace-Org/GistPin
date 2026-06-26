export interface ExpansionMonth {
  month: string;
  newLocations: number;
  cumulativeLocations: number;
  locations: string[];
}

export interface GeoConcentration {
  region: string;
  pct: number;
}

export interface UrbanRuralBreakdown {
  urban: number;
  suburban: number;
  rural: number;
}

const MONTHS: ExpansionMonth[] = [
  { month: '2026-01', newLocations: 3,  cumulativeLocations: 3,  locations: ['New York', 'London', 'Tokyo'] },
  { month: '2026-02', newLocations: 4,  cumulativeLocations: 7,  locations: ['Berlin', 'Paris', 'Sydney', 'Toronto'] },
  { month: '2026-03', newLocations: 5,  cumulativeLocations: 12, locations: ['São Paulo', 'Mumbai', 'Dubai', 'Seoul', 'Singapore'] },
  { month: '2026-04', newLocations: 6,  cumulativeLocations: 18, locations: ['Mexico City', 'Lagos', 'Cairo', 'Jakarta', 'Bangkok', 'Istanbul'] },
  { month: '2026-05', newLocations: 7,  cumulativeLocations: 25, locations: ['Buenos Aires', 'Lima', 'Nairobi', 'Cape Town', 'Riyadh', 'Kuala Lumpur', 'Ho Chi Minh City'] },
  { month: '2026-06', newLocations: 8,  cumulativeLocations: 33, locations: ['Lagos', 'Bogotá', 'Santiago', 'Lisbon', 'Amsterdam', 'Stockholm', 'Oslo', 'Helsinki'] },
];

const CONCENTRATIONS: GeoConcentration[] = [
  { region: 'North America', pct: 28 },
  { region: 'Europe',       pct: 25 },
  { region: 'Asia Pacific', pct: 22 },
  { region: 'South America', pct: 12 },
  { region: 'Africa',       pct: 8 },
  { region: 'Middle East',  pct: 5 },
];

const URBAN_RURAL: UrbanRuralBreakdown = { urban: 62, suburban: 26, rural: 12 };

export function getExpansionMonths(): ExpansionMonth[] {
  return MONTHS;
}

export function getGeoConcentrations(): GeoConcentration[] {
  return CONCENTRATIONS;
}

export function getUrbanRuralBreakdown(): UrbanRuralBreakdown {
  return URBAN_RURAL;
}

export function getGrowthFrontier(): string[] {
  return ['Lagos', 'Nairobi', 'Ho Chi Minh City', 'Bogotá', 'Lima'];
}
