export function calcLTV(arpu: number, churnRate: number): number {
  if (churnRate <= 0) return 0;
  return parseFloat((arpu / churnRate).toFixed(2));
}

export function calcRetentionLTV(arpu: number, retention: number, periods: number): number[] {
  const results: number[] = [];
  let cumulative = 0;
  let retained = 1;
  for (let i = 1; i <= periods; i++) {
    retained *= retention;
    cumulative += arpu * retained;
    results.push(parseFloat(cumulative.toFixed(2)));
  }
  return results;
}

export function cohortLTV(arpu: number, churnRate: number, cohorts: number): number[] {
  return Array.from({ length: cohorts }, (_, i) => {
    const adjustedChurn = churnRate * (1 - i * 0.02);
    return parseFloat((arpu / Math.max(adjustedChurn, 0.01)).toFixed(2));
  });
}
