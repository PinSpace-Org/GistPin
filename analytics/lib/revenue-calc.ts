export interface ProjectionInputs {
  currentUsers: number;
  monthlyGrowthRate: number;
  conversionRate: number;
  arpu: number;
}

export interface ProjectionRow {
  month: string;
  users: number;
  paidUsers: number;
  mrr: number;
  arr: number;
  clv: number;
}

export const MONTHS = [
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
  'Jan',
  'Feb',
  'Mar',
];

export const SCENARIOS = {
  conservative: {
    label: 'Conservative',
    monthlyGrowthRate: 3,
    conversionRate: 2,
    arpu: 8,
  },
  moderate: {
    label: 'Moderate',
    monthlyGrowthRate: 8,
    conversionRate: 4,
    arpu: 12,
  },
  aggressive: {
    label: 'Aggressive',
    monthlyGrowthRate: 15,
    conversionRate: 7,
    arpu: 18,
  },
} as const;

export type ScenarioType = keyof typeof SCENARIOS;

/**
 * Calculates revenue projections for a 12-month period based on growth inputs.
 */
export function calculateProjections(inputs: ProjectionInputs): ProjectionRow[] {
  const rows: ProjectionRow[] = [];
  let users = inputs.currentUsers;

  for (let i = 0; i < 12; i++) {
    // User growth: current * (1 + growth_rate)
    users = users * (1 + inputs.monthlyGrowthRate / 100);
    
    // Paid users based on conversion rate
    const paidUsers = users * (inputs.conversionRate / 100);
    
    // MRR = Paid Users * ARPU
    const mrr = paidUsers * inputs.arpu;
    
    // ARR = MRR * 12
    const arr = mrr * 12;
    
    // Simplified CLV calculation for the projection model
    const clv =
      inputs.arpu *
      (1 / (inputs.monthlyGrowthRate / 100 || 0.01)) *
      (inputs.conversionRate / 100);

    rows.push({
      month: MONTHS[i],
      users: Math.round(users),
      paidUsers: Math.round(paidUsers),
      mrr,
      arr,
      clv,
    });
  }

  return rows;
}
