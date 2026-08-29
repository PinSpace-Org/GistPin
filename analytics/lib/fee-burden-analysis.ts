/**
 * Wallet Transaction Cost Burden Analysis Engine (Issue #1188)
 * Evaluates how much XLM wallets spend on transaction fees relative to their activity,
 * calculates cost-vs-benefit ROI, detects high-burden wallets, and generates optimization recommendations.
 */

export type WalletTier =
  | 'whale'
  | 'curator_power'
  | 'tipping_power'
  | 'regular_poster'
  | 'micro_poster'
  | 'casual'
  | 'relay_node';

export interface WalletBurdenProfile {
  address: string;
  tier: WalletTier;
  balanceXlm: number;
  totalTransactions: number;
  totalFeesPaidXlm: number;
  avgFeePerTxXlm: number;
  totalVolumeTransactedXlm: number;
  feeBurdenPct: number; // (totalFees / totalVolume) * 100 or relative to balance
  isHighBurden: boolean; // Flagged if burden exceeds benchmark
  costVsBenefit: {
    totalTipsEarnedXlm: number;
    gistImpressionsEarned: number;
    netBenefitXlm: number; // tipsEarned - feesPaid
    roiMultiple: number; // (tips + value) / fees
  };
  recommendedOptimizations: string[];
  estimatedMonthlySavingsXlm: number;
  lastActive: string;
}

export interface TierCostSummary {
  tier: WalletTier;
  label: string;
  walletCount: number;
  avgTxCount: number;
  avgTotalFeeXlm: number;
  avgFeePerTxXlm: number;
  avgFeeBurdenPct: number;
  highBurdenRatePct: number;
  topRecommendation: string;
}

export interface FeeOptimizationOption {
  id: string;
  name: string;
  description: string;
  potentialFeeReductionPct: number;
  complexity: 'low' | 'medium' | 'high';
  applicability: string;
}

// ── Optimization Definitions ──────────────────────────────────────────────────

export const FEE_OPTIMIZATIONS: FeeOptimizationOption[] = [
  {
    id: 'tx_batching',
    name: 'Soroban Multi-Operation Batching',
    description: 'Combine up to 100 pin/like/tip operations into a single atomic transaction bundle',
    potentialFeeReductionPct: 68.0,
    complexity: 'low',
    applicability: 'High-frequency curators & micro-posters',
  },
  {
    id: 'off_peak_scheduling',
    name: 'Off-Peak Inclusion Fee Scheduling',
    description: 'Submit non-urgent indexing and archive events during low Stellar surge pricing windows',
    potentialFeeReductionPct: 35.0,
    complexity: 'low',
    applicability: 'Relay nodes & background indexers',
  },
  {
    id: 'footprint_pruning',
    name: 'Contract Storage Footprint Pruning',
    description: 'Prune unused read/write ledger keys in Soroban contract invocations to minimize footprint fee',
    potentialFeeReductionPct: 42.0,
    complexity: 'medium',
    applicability: 'Smart contract publishers & dApp integrations',
  },
  {
    id: 'sponsored_channels',
    name: 'GistPin Sponsored Fee-Bump Service',
    description: 'Route creator transactions through platform sponsored channel accounts (SEP-0029)',
    potentialFeeReductionPct: 100.0,
    complexity: 'medium',
    applicability: 'Micro-posters & new onboarded creators',
  },
];

// ── Mock & Analysis Dataset Generators ────────────────────────────────────────

export function getTierCostSummaries(): TierCostSummary[] {
  return [
    {
      tier: 'micro_poster',
      label: 'Micro-Posters (<10 XLM Vol)',
      walletCount: 4250,
      avgTxCount: 24,
      avgTotalFeeXlm: 0.18,
      avgFeePerTxXlm: 0.0075,
      avgFeeBurdenPct: 8.4,
      highBurdenRatePct: 42.1,
      topRecommendation: 'Route via Sponsored Fee-Bump channel accounts to eliminate entry barrier',
    },
    {
      tier: 'casual',
      label: 'Casual Consumers',
      walletCount: 8900,
      avgTxCount: 12,
      avgTotalFeeXlm: 0.06,
      avgFeePerTxXlm: 0.0050,
      avgFeeBurdenPct: 4.2,
      highBurdenRatePct: 18.5,
      topRecommendation: 'Adopt client-side transaction debouncing',
    },
    {
      tier: 'regular_poster',
      label: 'Regular Content Creators',
      walletCount: 3100,
      avgTxCount: 85,
      avgTotalFeeXlm: 0.42,
      avgFeePerTxXlm: 0.0049,
      avgFeeBurdenPct: 1.8,
      highBurdenRatePct: 6.2,
      topRecommendation: 'Batch comment reactions and tip signatures',
    },
    {
      tier: 'curator_power',
      label: 'High-Frequency Curators',
      walletCount: 780,
      avgTxCount: 450,
      avgTotalFeeXlm: 2.15,
      avgFeePerTxXlm: 0.0048,
      avgFeeBurdenPct: 1.2,
      highBurdenRatePct: 4.8,
      topRecommendation: 'Use atomic Soroban multi-op batching for up to 68% savings',
    },
    {
      tier: 'tipping_power',
      label: 'Tipping Power Users',
      walletCount: 420,
      avgTxCount: 320,
      avgTotalFeeXlm: 1.85,
      avgFeePerTxXlm: 0.0058,
      avgFeeBurdenPct: 0.9,
      highBurdenRatePct: 2.1,
      topRecommendation: 'Utilize Stellar pre-authorized debit pools',
    },
    {
      tier: 'relay_node',
      label: 'Relay Nodes & Indexers',
      walletCount: 85,
      avgTxCount: 5400,
      avgTotalFeeXlm: 24.8,
      avgFeePerTxXlm: 0.0046,
      avgFeeBurdenPct: 0.4,
      highBurdenRatePct: 8.5,
      topRecommendation: 'Schedule off-peak surge avoidance and prune read-write footprint keys',
    },
    {
      tier: 'whale',
      label: 'Ecosystem Whales',
      walletCount: 45,
      avgTxCount: 180,
      avgTotalFeeXlm: 1.2,
      avgFeePerTxXlm: 0.0067,
      avgFeeBurdenPct: 0.05,
      highBurdenRatePct: 0.0,
      topRecommendation: 'Contract footprint optimization on large liquidity deployments',
    },
  ];
}

export function getSampleWalletProfiles(): WalletBurdenProfile[] {
  return [
    {
      address: 'GBZX...4K9L',
      tier: 'micro_poster',
      balanceXlm: 4.8,
      totalTransactions: 64,
      totalFeesPaidXlm: 0.48,
      avgFeePerTxXlm: 0.0075,
      totalVolumeTransactedXlm: 5.2,
      feeBurdenPct: 9.23,
      isHighBurden: true,
      costVsBenefit: {
        totalTipsEarnedXlm: 1.2,
        gistImpressionsEarned: 1420,
        netBenefitXlm: 0.72,
        roiMultiple: 2.5,
      },
      recommendedOptimizations: [
        'Eligible for 100% sponsored fee bumps',
        'Batch pin postings into single contract invocations',
      ],
      estimatedMonthlySavingsXlm: 0.45,
      lastActive: '10 mins ago',
    },
    {
      address: 'GCAQ...7R2P',
      tier: 'micro_poster',
      balanceXlm: 2.1,
      totalTransactions: 42,
      totalFeesPaidXlm: 0.36,
      avgFeePerTxXlm: 0.0085,
      totalVolumeTransactedXlm: 3.5,
      feeBurdenPct: 10.28,
      isHighBurden: true,
      costVsBenefit: {
        totalTipsEarnedXlm: 0.5,
        gistImpressionsEarned: 890,
        netBenefitXlm: 0.14,
        roiMultiple: 1.39,
      },
      recommendedOptimizations: [
        'Enable sponsored onboarding channel account',
        'Avoid surge-pricing peak ledgers',
      ],
      estimatedMonthlySavingsXlm: 0.32,
      lastActive: '25 mins ago',
    },
    {
      address: 'GDHM...9N4X',
      tier: 'curator_power',
      balanceXlm: 840.0,
      totalTransactions: 620,
      totalFeesPaidXlm: 3.1,
      avgFeePerTxXlm: 0.005,
      totalVolumeTransactedXlm: 280.0,
      feeBurdenPct: 1.11,
      isHighBurden: false,
      costVsBenefit: {
        totalTipsEarnedXlm: 48.5,
        gistImpressionsEarned: 18500,
        netBenefitXlm: 45.4,
        roiMultiple: 15.6,
      },
      recommendedOptimizations: [
        'Batch curator reaction signatures to reduce invocation overhead by 68%',
      ],
      estimatedMonthlySavingsXlm: 2.1,
      lastActive: '2 hours ago',
    },
    {
      address: 'GA8K...1W3V',
      tier: 'tipping_power',
      balanceXlm: 1250.0,
      totalTransactions: 480,
      totalFeesPaidXlm: 2.75,
      avgFeePerTxXlm: 0.0057,
      totalVolumeTransactedXlm: 450.0,
      feeBurdenPct: 0.61,
      isHighBurden: false,
      costVsBenefit: {
        totalTipsEarnedXlm: 12.0,
        gistImpressionsEarned: 9400,
        netBenefitXlm: 9.25,
        roiMultiple: 4.36,
      },
      recommendedOptimizations: [
        'Use pre-authorized debit pools to save base reserve costs',
      ],
      estimatedMonthlySavingsXlm: 1.4,
      lastActive: '45 mins ago',
    },
    {
      address: 'GB2L...8M0K',
      tier: 'relay_node',
      balanceXlm: 350.0,
      totalTransactions: 8400,
      totalFeesPaidXlm: 38.5,
      avgFeePerTxXlm: 0.0046,
      totalVolumeTransactedXlm: 8900.0,
      feeBurdenPct: 0.43,
      isHighBurden: false,
      costVsBenefit: {
        totalTipsEarnedXlm: 185.0,
        gistImpressionsEarned: 95000,
        netBenefitXlm: 146.5,
        roiMultiple: 4.8,
      },
      recommendedOptimizations: [
        'Schedule off-peak inclusion fee windows',
        'Prune Soroban contract footprint storage keys',
      ],
      estimatedMonthlySavingsXlm: 14.2,
      lastActive: 'Just now',
    },
  ];
}

export function getTierHistoricalCostTrend() {
  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
  return {
    months,
    microPostersBurden: [11.2, 10.4, 9.8, 9.1, 8.8, 8.4],
    casualBurden: [5.8, 5.2, 4.8, 4.5, 4.3, 4.2],
    regularPosterBurden: [2.5, 2.3, 2.1, 1.9, 1.8, 1.8],
    curatorsBurden: [1.8, 1.6, 1.4, 1.3, 1.2, 1.2],
  };
}
