export interface DevCostInputs {
  designCost: number;
  frontendCost: number;
  backendCost: number;
  smartContractCost: number;
  qaCost: number;
  monthlyOpsCost: number;
}

export interface UserValueEstimate {
  totalUsers: number;
  freeUsers: number;
  paidUsers: number;
  pricePerUserPerMonth: number;
}

export interface RevenueProjection {
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  platformFees: number;
  totalAnnualRevenue: number;
}

export interface BreakEvenResult {
  totalDevelopmentCost: number;
  monthlyNetRevenue: number;
  breakEvenMonths: number;
  breakEvenDate: string;
}

export interface ROIScenario {
  label: string;
  devCostMultiplier: number;
  userGrowthMultiplier: number;
  revenueMultiplier: number;
  netProfit: number;
  roiPercent: number;
  breakEvenMonths: number;
}

export function calculateDevCost(inputs: DevCostInputs): number {
  return (
    inputs.designCost +
    inputs.frontendCost +
    inputs.backendCost +
    inputs.smartContractCost +
    inputs.qaCost
  );
}

export function estimateUserValue(estimate: UserValueEstimate): {
  monthlyRevenue: number;
  annualRevenue: number;
} {
  const monthlyRevenue = estimate.paidUsers * estimate.pricePerUserPerMonth;
  const annualRevenue = monthlyRevenue * 12;
  return { monthlyRevenue, annualRevenue };
}

export function projectRevenue(
  userValue: { monthlyRevenue: number; annualRevenue: number },
  monthlyOpsCost: number,
  platformFeeRate: number,
  totalTransactionVolume: number
): RevenueProjection {
  const monthlyRecurringRevenue = userValue.monthlyRevenue;
  const annualRecurringRevenue = userValue.annualRevenue;
  const platformFees = totalTransactionVolume * platformFeeRate;
  const totalAnnualRevenue = annualRecurringRevenue + platformFees;
  return {
    monthlyRecurringRevenue: parseFloat(monthlyRecurringRevenue.toFixed(2)),
    annualRecurringRevenue: parseFloat(annualRecurringRevenue.toFixed(2)),
    platformFees: parseFloat(platformFees.toFixed(2)),
    totalAnnualRevenue: parseFloat(totalAnnualRevenue.toFixed(2)),
  };
}

export function calculateBreakEven(
  devCostInputs: DevCostInputs,
  monthlyRevenue: number
): BreakEvenResult {
  const totalDevCost = calculateDevCost(devCostInputs);
  const monthlyNetRevenue = monthlyRevenue - devCostInputs.monthlyOpsCost;
  const breakEvenMonths =
    monthlyNetRevenue > 0
      ? Math.ceil(totalDevCost / monthlyNetRevenue)
      : Infinity;
  const now = new Date();
  const beDate = new Date(now.getFullYear(), now.getMonth() + breakEvenMonths, 1);
  return {
    totalDevelopmentCost: totalDevCost,
    monthlyNetRevenue: parseFloat(monthlyNetRevenue.toFixed(2)),
    breakEvenMonths,
    breakEvenDate: beDate.toISOString().slice(0, 7),
  };
}

export function compareScenarios(
  baseInputs: DevCostInputs,
  baseUserValue: UserValueEstimate,
  baseRevenue: RevenueProjection
): ROIScenario[] {
  const totalDevCost = calculateDevCost(baseInputs);
  const scenarios: ROIScenario[] = [
    { label: 'Conservative', devCostMultiplier: 1.3, userGrowthMultiplier: 0.7, revenueMultiplier: 0.8 },
    { label: 'Expected', devCostMultiplier: 1.0, userGrowthMultiplier: 1.0, revenueMultiplier: 1.0 },
    { label: 'Optimistic', devCostMultiplier: 0.8, userGrowthMultiplier: 1.5, revenueMultiplier: 1.3 },
  ];

  return scenarios.map((s) => {
    const cost = totalDevCost * s.devCostMultiplier;
    const monthlyNet =
      (baseRevenue.monthlyRecurringRevenue * s.revenueMultiplier) -
      (baseInputs.monthlyOpsCost * s.devCostMultiplier);
    const annualProfit = monthlyNet * 12 - cost;
    const roi = cost > 0 ? parseFloat(((annualProfit / cost) * 100).toFixed(1)) : 0;
    const beMonths = monthlyNet > 0 ? Math.ceil(cost / monthlyNet) : Infinity;

    return {
      label: s.label,
      devCostMultiplier: s.devCostMultiplier,
      userGrowthMultiplier: s.userGrowthMultiplier,
      revenueMultiplier: s.revenueMultiplier,
      netProfit: parseFloat(annualProfit.toFixed(0)),
      roiPercent: roi,
      breakEvenMonths: beMonths,
    };
  });
}
