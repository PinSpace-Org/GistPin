export type Currency = 'USD' | 'EUR' | 'NGN' | 'GBP' | 'JPY' | 'CNY';

export interface ConversionRates {
  [key: string]: number;
}

const MOCK_RATES: ConversionRates = {
  USD: 0.089,
  EUR: 0.082,
  NGN: 141.50,
  GBP: 0.070,
  JPY: 13.12,
  CNY: 0.64,
};

export function getRates(): ConversionRates {
  return { ...MOCK_RATES, XLM: 1 };
}

export function convertXlm(amount: number, target: Currency): number {
  return amount * (MOCK_RATES[target] ?? 1);
}

export function formatCurrency(amount: number, currency: Currency): string {
  const sym: Record<string, string> = { USD: '$', EUR: '€', NGN: '₦', GBP: '£', JPY: '¥', CNY: '¥' };
  const fmt = amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sym[currency] ?? ''}${fmt}`;
}

export const CURRENCIES: Currency[] = ['USD', 'EUR', 'NGN', 'GBP', 'JPY', 'CNY'];

export interface TipEntry {
  gistId: string;
  title: string;
  xlmAmount: number;
  timestamp: string;
  location: string;
}

export const SAMPLE_TIPS: TipEntry[] = [
  { gistId: 'G-1001', title: 'Great restaurant guide!',              xlmAmount: 50,   timestamp: '2026-06-25 09:15', location: 'New York' },
  { gistId: 'G-0998', title: 'Thanks for the safety alert',          xlmAmount: 30,   timestamp: '2026-06-25 08:42', location: 'London' },
  { gistId: 'G-0995', title: 'Best event coverage this year',        xlmAmount: 120,  timestamp: '2026-06-25 08:10', location: 'Tokyo' },
  { gistId: 'G-0991', title: 'Helpful transit update',               xlmAmount: 15,   timestamp: '2026-06-25 07:30', location: 'Berlin' },
  { gistId: 'G-0987', title: 'Incredible photo collection',          xlmAmount: 200,  timestamp: '2026-06-25 06:55', location: 'São Paulo' },
  { gistId: 'G-0982', title: 'Saved my day with this info',          xlmAmount: 40,   timestamp: '2026-06-25 06:12', location: 'Lagos' },
  { gistId: 'G-0978', title: 'Brilliant hackathon project',          xlmAmount: 85,   timestamp: '2026-06-25 05:30', location: 'Sydney' },
  { gistId: 'G-0973', title: 'Very clear instructions',              xlmAmount: 25,   timestamp: '2026-06-25 04:48', location: 'Dubai' },
];
