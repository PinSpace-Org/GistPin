export function getWalletAgeCategory(createdAt: Date): string {
  const months = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 1) return '< 1 month';
  if (months < 3) return '1-3 months';
  if (months < 6) return '3-6 months';
  if (months < 12) return '6-12 months';
  return '> 1 year';
}
