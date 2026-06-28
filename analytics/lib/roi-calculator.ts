export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  spend: number;
  revenue: number;
  roi: number;
  paybackPeriod: number;
}

export interface ROISummary {
  totalSpend: number;
  totalRevenue: number;
  averageROI: number;
  averagePaybackPeriod: number;
  campaignCount: number;
}

export function calculateCampaignROI(spend: number, revenue: number): number {
  if (spend <= 0) return 0;
  return parseFloat((((revenue - spend) / spend) * 100).toFixed(2));
}

export function calculatePaybackPeriod(initialInvestment: number, monthlyReturn: number): number {
  if (monthlyReturn <= 0) return Infinity;
  return parseFloat((initialInvestment / monthlyReturn).toFixed(1));
}

export function computeCampaignROIs(campaigns: { id: string; name: string; spend: number; revenue: number }[]): CampaignROI[] {
  return campaigns.map(c => ({
    campaignId: c.id,
    campaignName: c.name,
    spend: c.spend,
    revenue: c.revenue,
    roi: calculateCampaignROI(c.spend, c.revenue),
    paybackPeriod: calculatePaybackPeriod(c.spend, c.revenue / 12)
  }));
}

export function summarizeROI(rois: CampaignROI[]): ROISummary {
  const totalSpend = rois.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = rois.reduce((s, r) => s + r.revenue, 0);
  const averageROI = rois.length > 0 ? rois.reduce((s, r) => s + r.roi, 0) / rois.length : 0;
  const averagePaybackPeriod = rois.length > 0 ? rois.reduce((s, r) => s + r.paybackPeriod, 0) / rois.length : 0;

  return {
    totalSpend,
    totalRevenue,
    averageROI: parseFloat(averageROI.toFixed(2)),
    averagePaybackPeriod: parseFloat(averagePaybackPeriod.toFixed(1)),
    campaignCount: rois.length
  };
}
