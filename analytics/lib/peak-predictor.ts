export interface PredictionResult {
  label: string;
  currentValue: number;
  predictedValue: number;
  unit: string;
  confidence: number;
  direction: 'up' | 'down' | 'stable';
}

export function getPredictions(): PredictionResult[] {
  return [
    { label: 'Daily Active Users',          currentValue: 14200, predictedValue: 16800, unit: 'users', confidence: 85, direction: 'up' },
    { label: 'Daily Tips (XLM)',            currentValue: 580,   predictedValue: 720,   unit: 'XLM',  confidence: 78, direction: 'up' },
    { label: 'New Gists / Day',             currentValue: 420,   predictedValue: 510,   unit: 'gists', confidence: 82, direction: 'up' },
    { label: 'Avg Session Duration',        currentValue: 8.4,   predictedValue: 9.2,   unit: 'min',  confidence: 72, direction: 'up' },
    { label: 'Spam Rate (%)',               currentValue: 3.2,   predictedValue: 2.8,   unit: '%',    confidence: 80, direction: 'down' },
    { label: 'Error Rate (%)',              currentValue: 0.27,  predictedValue: 0.22,  unit: '%',    confidence: 88, direction: 'down' },
  ];
}

export function getHistoricalTrend(): { month: string; actual: number; predicted: number }[] {
  return [
    { month: 'Jan', actual: 8200,  predicted: 8000 },
    { month: 'Feb', actual: 8800,  predicted: 8500 },
    { month: 'Mar', actual: 9500,  predicted: 9200 },
    { month: 'Apr', actual: 10500, predicted: 10000 },
    { month: 'May', actual: 11800, predicted: 11200 },
    { month: 'Jun', actual: 12500, predicted: 12000 },
    { month: 'Jul', actual: 0,     predicted: 13500 },
    { month: 'Aug', actual: 0,     predicted: 14800 },
    { month: 'Sep', actual: 0,     predicted: 16000 },
  ];
}

export function getConfidenceInterval(label: string): { low: number; high: number } {
  const intervals: Record<string, { low: number; high: number }> = {
    'Daily Active Users':  { low: 15200, high: 18500 },
    'Daily Tips (XLM)':    { low: 640,   high: 810 },
    'New Gists / Day':     { low: 460,   high: 570 },
    'Avg Session Duration': { low: 8.6,  high: 9.9 },
    'Spam Rate (%)':       { low: 2.4,   high: 3.2 },
    'Error Rate (%)':      { low: 0.18,  high: 0.26 },
  };
  return intervals[label] ?? { low: 0, high: 0 };
}
