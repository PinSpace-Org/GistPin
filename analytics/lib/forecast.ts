export interface DataPoint {
  label: string;
  value: number;
}

export interface ForecastResult {
  historical: DataPoint[];
  forecast: DataPoint[];
  upperBound: DataPoint[];
  lowerBound: DataPoint[];
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  const slope =
    values.reduce((acc, y, i) => acc + (i - meanX) * (y - meanY), 0) /
    values.reduce((acc, _, i) => acc + (i - meanX) ** 2, 0);
  const intercept = meanY - slope * meanX;
  const ssTot = values.reduce((acc, y) => acc + (y - meanY) ** 2, 0);
  const ssRes = values.reduce((acc, y, i) => acc + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

export function generateForecast(historical: DataPoint[], days = 7, confidencePct = 0.2): ForecastResult {
  const values = historical.map((p) => p.value);
  const { slope, intercept, r2 } = linearRegression(values);
  const now = Date.now();

  const forecast: DataPoint[] = Array.from({ length: days }, (_, i) => {
    const x = values.length + i;
    const d = new Date(now + (i + 1) * 86_400_000);
    return {
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value: Math.round(slope * x + intercept),
    };
  });

  const upperBound = forecast.map((p) => ({ ...p, value: Math.round(p.value * (1 + confidencePct)) }));
  const lowerBound = forecast.map((p) => ({ ...p, value: Math.round(p.value * (1 - confidencePct)) }));

  return { historical, forecast, upperBound, lowerBound, slope, intercept, r2 };
}

export function generateHistoricalData(days = 30): DataPoint[] {
  const now = Date.now();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86_400_000);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const trend = 100 + i * 1.5;
    const value = Math.round(
      Math.min(200, Math.max(50, trend + (Math.random() - 0.5) * 40 - (isWeekend ? 20 : 0)))
    );
    return { label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value };
  });
}
