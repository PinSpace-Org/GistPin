export interface ExpiryPrediction {
  gistId: string;
  title: string;
  language: string;
  createdAt: string;
  ttlHours: number;
  predictedExpiryHours: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  engagementTrend: 'rising' | 'stable' | 'declining';
  lastAccessed: string;
  viewCount: number;
  reactionCount: number;
  recommendedTtlExtension: number | null;
}

export interface ModelAccuracy {
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  monthlyAccuracy: { month: string; accuracy: number }[];
}

export interface TTLRecommendation {
  gistId: string;
  title: string;
  currentTtl: string;
  recommendedTtl: string;
  reason: string;
  potentialEngagementGain: number;
}

export function generateExpiryPredictions(): ExpiryPrediction[] {
  const languages = ['JavaScript', 'Python', 'TypeScript', 'Rust', 'Go', 'Solidity', 'Haskell'];
  const titles = [
    'Smart Contract ABI Decoder', 'DeFi Yield Aggregator', 'IPFS Pinning Script',
    'Stellar Transaction Builder', 'Web3 Auth Middleware', 'React Chart Wrapper',
    'GraphQL Schema Generator', 'Rust Error Handler', 'Go Concurrent Worker',
    'Python ML Pipeline', 'TypeScript Type Utils', 'Haskell Parser Combinator',
    'ZK Proof Verifier', 'Cross-chain Bridge Logic', 'NFT Metadata Serializer',
    'Solana Program Loader', 'EVM Gas Estimator', 'Validator Health Check',
    'Content Hash Verification', 'Wallet Recovery Script',
  ];

  return titles.map((title, i) => {
    const ttlHours = [1, 6, 12, 24, 72, 168, 720][i % 7];
    const riskScore = Math.round(15 + Math.random() * 80);
    const riskLevel: ExpiryPrediction['riskLevel'] =
      riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
    const engagementTrend: ExpiryPrediction['engagementTrend'] =
      riskScore >= 60 ? 'declining' : riskScore >= 35 ? 'stable' : 'rising';
    const confidence = 0.72 + Math.random() * 0.25;
    const daysAgo = 1 + Math.floor(Math.random() * 28);
    const created = new Date(Date.now() - daysAgo * 86400000);
    const lastAccessed = new Date(created.getTime() + Math.random() * daysAgo * 86400000);
    const predictedExpiryHours = Math.round(ttlHours * (0.3 + Math.random() * 0.7));
    const viewCount = Math.round(10 + Math.random() * 500);
    const reactionCount = Math.round(1 + Math.random() * 60);

    return {
      gistId: `gist-${(i + 1).toString().padStart(4, '0')}`,
      title,
      language: languages[i % languages.length],
      createdAt: created.toISOString().split('T')[0],
      ttlHours,
      predictedExpiryHours,
      riskScore,
      riskLevel,
      confidence: parseFloat(confidence.toFixed(3)),
      engagementTrend,
      lastAccessed: lastAccessed.toISOString().split('T')[0],
      viewCount,
      reactionCount,
      recommendedTtlExtension: riskLevel === 'critical' ? ttlHours * 3 : riskLevel === 'high' ? ttlHours * 2 : null,
    };
  });
}

export function getModelAccuracy(): ModelAccuracy {
  return {
    correctPredictions: 847,
    totalPredictions: 1023,
    accuracy: 82.8,
    precision: 84.2,
    recall: 81.5,
    f1Score: 82.8,
    monthlyAccuracy: [
      { month: 'Jan', accuracy: 76.4 },
      { month: 'Feb', accuracy: 78.1 },
      { month: 'Mar', accuracy: 79.8 },
      { month: 'Apr', accuracy: 80.5 },
      { month: 'May', accuracy: 81.9 },
      { month: 'Jun', accuracy: 82.8 },
    ],
  };
}

export function getTTLRecommendations(predictions: ExpiryPrediction[]): TTLRecommendation[] {
  const formatTtl = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    return `${Math.round(hours / 168)}w`;
  };

  return predictions
    .filter((p) => p.recommendedTtlExtension !== null)
    .map((p) => ({
      gistId: p.gistId,
      title: p.title,
      currentTtl: formatTtl(p.ttlHours),
      recommendedTtl: formatTtl(p.ttlHours + p.recommendedTtlExtension!),
      reason:
        p.engagementTrend === 'declining'
          ? 'Declining engagement suggests extended TTL to recover'
          : 'High risk score warrants longer preservation window',
      potentialEngagementGain: Math.round(10 + Math.random() * 40),
    }));
}

export function getRiskDistribution(predictions: ExpiryPrediction[]) {
  const dist = { low: 0, medium: 0, high: 0, critical: 0 };
  predictions.forEach((p) => { dist[p.riskLevel]++; });
  return Object.entries(dist).map(([level, count]) => ({ level, count }));
}

export function getMonthlyExpiryTrend() {
  return {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    expired: [124, 108, 95, 112, 89, 76],
    predicted: [138, 120, 102, 118, 96, 82],
    saved: [42, 38, 35, 40, 33, 28],
  };
}
