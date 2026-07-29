export interface UptimeResult { uptimePercent: number; downtimeSeconds: number; slaCredit: number; }
export function calculateUptime(totalMinutes: number, downtimeMinutes: number): UptimeResult {
  const uptimePercent = ((totalMinutes - downtimeMinutes) / totalMinutes) * 100;
  const slaCredit = uptimePercent < 99.9 ? 0.1 : uptimePercent < 99.0 ? 0.25 : 0;
  return { uptimePercent, downtimeSeconds: downtimeMinutes * 60, slaCredit };
}
