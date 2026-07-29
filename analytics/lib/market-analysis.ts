export interface MarketData { city: string; country: string; users: number; growth: number; }
export function getMarketData(): MarketData[] {
  return [
    { city:'New York', country:'US', users:1250, growth:12 },
    { city:'London', country:'UK', users:890, growth:8 },
    { city:'Tokyo', country:'JP', users:670, growth:15 },
  ];
}
