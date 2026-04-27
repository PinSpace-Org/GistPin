export interface RevenueInputs {
  currentUsers: number;
  monthlyGrowthRate: number; // percent
  conversionRate: number;    // percent
  arpu: number;              // $ per user per month
}

export interface MonthlyProjection {
  month: string;
  users: number;
  paidUsers: number;
  mrr: number;
  arr: number;
  clv: number;
}

const MONTHS = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

export function calcProjections(inputs: RevenueInputs): MonthlyProjection[] {
  let users = inputs.currentUsers;
  return MONTHS.map((month) => {
    users = users * (1 + inputs.monthlyGrowthRate / 100);
    const paidUsers = users * (inputs.conversionRate / 100);
    const mrr = paidUsers * inputs.arpu;
    const arr = mrr * 12;
    const clv = inputs.arpu * (1 / (inputs.monthlyGrowthRate / 100 || 0.01)) * (inputs.conversionRate / 100);
    return { month, users: Math.round(users), paidUsers: Math.round(paidUsers), mrr, arr, clv };
  });
}

export const SCENARIOS = {
  conservative: { monthlyGrowthRate: 3,  conversionRate: 2,  arpu: 8  },
  moderate:     { monthlyGrowthRate: 8,  conversionRate: 4,  arpu: 12 },
  aggressive:   { monthlyGrowthRate: 15, conversionRate: 7,  arpu: 18 },
} as const;

export type Scenario = keyof typeof SCENARIOS;
