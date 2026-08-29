/**
 * Platform Data Completeness Scorer (Issue #1186)
 * Audits on-chain vs indexed sync status, IPFS blob availability, metadata completeness,
 * and missing data business impact analysis.
 */

export interface SyncAuditSummary {
  onChainTotalEvents: number;
  indexedGistsCount: number;
  missingIndexedCount: number;
  syncCompletenessPct: number; // e.g. 99.4%
  currentLedgerHeight: number;
  lastIndexedLedgerHeight: number;
  ledgerLag: number;
  orphanGistsCount: number;
  orphanRatePct: number;
}

export interface IpfsAvailabilitySummary {
  totalCidsMonitored: number;
  reachableCidsCount: number;
  unreachableCidsCount: number;
  availabilityRatePct: number; // e.g. 98.7%
  avgRetrievalLatencyMs: number;
  pinnedReplicasAvg: number;
  corruptedBlobsCount: number;
  storageProviders: Array<{
    name: string;
    pinCount: number;
    uptimePct: number;
    status: 'healthy' | 'degraded' | 'offline';
  }>;
}

export interface MetadataFieldAudit {
  fieldName: string;
  category: 'core' | 'spatial' | 'provenance' | 'media';
  totalChecked: number;
  populatedCount: number;
  completenessPct: number;
  isRequired: boolean;
  importanceWeight: number; // 0 - 1
  impactOnSearch: 'critical' | 'moderate' | 'low';
}

export interface MissingDataImpact {
  domain: string;
  impactLevel: 'high' | 'medium' | 'low';
  affectedFeature: string;
  omissionPenaltyScore: number; // 0 - 100
  estimatedLostQueriesMonthly: number;
  remediationAction: string;
  backfillEstimatedDurationMinutes: number;
}

export interface CompletenessScorecard {
  overallScore: number; // 0 - 100
  letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  calculatedAt: number;
  syncAudit: SyncAuditSummary;
  ipfsAudit: IpfsAvailabilitySummary;
  metadataAudit: MetadataFieldAudit[];
  impactAnalysis: MissingDataImpact[];
  historicalTrend: Array<{
    date: string;
    overallScore: number;
    syncRate: number;
    ipfsRate: number;
    metadataRate: number;
  }>;
  recommendedBackfills: Array<{
    id: string;
    title: string;
    priority: 'urgent' | 'recommended' | 'optional';
    recordsToProcess: number;
    targetSystem: 'PostGIS' | 'IPFS Gateway' | 'Stellar Indexer';
  }>;
}

// ── Scoring Algorithms ────────────────────────────────────────────────────────

/**
 * Calculates overall completeness score (0-100) and letter grade
 */
export function calculateOverallCompleteness(
  syncRate: number,
  ipfsRate: number,
  metadataRate: number
): { score: number; grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' } {
  // Weights: Sync (35%), IPFS Availability (35%), Metadata Richness (30%)
  const score = +(syncRate * 0.35 + ipfsRate * 0.35 + metadataRate * 0.3).toFixed(1);

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (score >= 97) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  return { score, grade };
}

/**
 * Computes metadata field weighted completeness rate
 */
export function calculateMetadataCompletenessRate(fields: MetadataFieldAudit[]): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const f of fields) {
    totalWeight += f.importanceWeight;
    weightedSum += f.completenessPct * f.importanceWeight;
  }

  return totalWeight > 0 ? +(weightedSum / totalWeight).toFixed(1) : 0;
}

// ── Mock & Audit Data Generators ──────────────────────────────────────────────

export function getPlatformCompletenessScorecard(): CompletenessScorecard {
  const syncAudit: SyncAuditSummary = {
    onChainTotalEvents: 148_920,
    indexedGistsCount: 148_240,
    missingIndexedCount: 680,
    syncCompletenessPct: 99.54,
    currentLedgerHeight: 52_184_900,
    lastIndexedLedgerHeight: 52_184_894,
    ledgerLag: 6,
    orphanGistsCount: 42,
    orphanRatePct: 0.03,
  };

  const ipfsAudit: IpfsAvailabilitySummary = {
    totalCidsMonitored: 148_240,
    reachableCidsCount: 146_980,
    unreachableCidsCount: 1_260,
    availabilityRatePct: 99.15,
    avgRetrievalLatencyMs: 184,
    pinnedReplicasAvg: 3.4,
    corruptedBlobsCount: 18,
    storageProviders: [
      { name: 'Pinata Gateway Primary', pinCount: 148_240, uptimePct: 99.98, status: 'healthy' },
      { name: 'Web3.Storage Secondary', pinCount: 142_500, uptimePct: 99.85, status: 'healthy' },
      { name: 'GistPin Local IPFS Node Cluster', pinCount: 148_010, uptimePct: 99.92, status: 'healthy' },
      { name: 'Filecoin Long-term Archive', pinCount: 120_400, uptimePct: 98.40, status: 'degraded' },
    ],
  };

  const metadataAudit: MetadataFieldAudit[] = [
    {
      fieldName: 'Geographic Coordinates (lat, lng)',
      category: 'spatial',
      totalChecked: 148_240,
      populatedCount: 147_950,
      completenessPct: 99.8,
      isRequired: true,
      importanceWeight: 1.0,
      impactOnSearch: 'critical',
    },
    {
      fieldName: 'Gist Content Payload (text/markdown)',
      category: 'core',
      totalChecked: 148_240,
      populatedCount: 148_240,
      completenessPct: 100.0,
      isRequired: true,
      importanceWeight: 1.0,
      impactOnSearch: 'critical',
    },
    {
      fieldName: 'Author Stellar Public Key & Signature',
      category: 'provenance',
      totalChecked: 148_240,
      populatedCount: 148_190,
      completenessPct: 99.96,
      isRequired: true,
      importanceWeight: 0.95,
      impactOnSearch: 'critical',
    },
    {
      fieldName: 'PostGIS Spatial Boundary Grid ID',
      category: 'spatial',
      totalChecked: 148_240,
      populatedCount: 146_200,
      completenessPct: 98.62,
      isRequired: false,
      importanceWeight: 0.8,
      impactOnSearch: 'critical',
    },
    {
      fieldName: 'Categorization Tags & Taxonomy',
      category: 'core',
      totalChecked: 148_240,
      populatedCount: 134_800,
      completenessPct: 90.93,
      isRequired: false,
      importanceWeight: 0.75,
      impactOnSearch: 'moderate',
    },
    {
      fieldName: 'IPFS Multi-hash Integrity Digest',
      category: 'media',
      totalChecked: 148_240,
      populatedCount: 146_980,
      completenessPct: 99.15,
      isRequired: true,
      importanceWeight: 0.9,
      impactOnSearch: 'critical',
    },
    {
      fieldName: 'Media Preview Image / Thumbnail CID',
      category: 'media',
      totalChecked: 148_240,
      populatedCount: 112_400,
      completenessPct: 75.82,
      isRequired: false,
      importanceWeight: 0.5,
      impactOnSearch: 'low',
    },
    {
      fieldName: 'Language & Locale Tag',
      category: 'core',
      totalChecked: 148_240,
      populatedCount: 128_600,
      completenessPct: 86.75,
      isRequired: false,
      importanceWeight: 0.6,
      impactOnSearch: 'moderate',
    },
  ];

  const impactAnalysis: MissingDataImpact[] = [
    {
      domain: 'Spatial Geospatial Radius Discovery',
      impactLevel: 'high',
      affectedFeature: 'Near-Me Gist Feed & Map Pin Clusters',
      omissionPenaltyScore: 82,
      estimatedLostQueriesMonthly: 14_200,
      remediationAction: 'Run PostGIS ST_SetSRID backfill on unindexed coordinate pairs',
      backfillEstimatedDurationMinutes: 8,
    },
    {
      domain: 'Search & Keyword Discovery',
      impactLevel: 'medium',
      affectedFeature: 'Fuzzy Full-Text & Tag Exploration',
      omissionPenaltyScore: 48,
      estimatedLostQueriesMonthly: 8_400,
      remediationAction: 'Trigger NLP auto-tagging worker on unclassified gist payloads',
      backfillEstimatedDurationMinutes: 24,
    },
    {
      domain: 'IPFS Media Rendition Availability',
      impactLevel: 'medium',
      affectedFeature: 'Pin Content Rendering & Offline Cache',
      omissionPenaltyScore: 54,
      estimatedLostQueriesMonthly: 5_100,
      remediationAction: 'Re-request unpinned CIDs via IPFS DHT multi-gateway crawler',
      backfillEstimatedDurationMinutes: 45,
    },
    {
      domain: 'Author Provenance & Reputation',
      impactLevel: 'low',
      affectedFeature: 'Creator Trust Badge & Tipping Route',
      omissionPenaltyScore: 12,
      estimatedLostQueriesMonthly: 620,
      remediationAction: 'Re-verify Stellar ed25519 signature against Horizon ledger state',
      backfillEstimatedDurationMinutes: 3,
    },
  ];

  const metadataRate = calculateMetadataCompletenessRate(metadataAudit);
  const { score: overallScore, grade: letterGrade } = calculateOverallCompleteness(
    syncAudit.syncCompletenessPct,
    ipfsAudit.availabilityRatePct,
    metadataRate
  );

  const historicalTrend = [
    { date: 'Aug 01', overallScore: 92.4, syncRate: 97.8, ipfsRate: 96.5, metadataRate: 91.2 },
    { date: 'Aug 07', overallScore: 94.1, syncRate: 98.4, ipfsRate: 97.8, metadataRate: 92.4 },
    { date: 'Aug 14', overallScore: 95.8, syncRate: 98.9, ipfsRate: 98.2, metadataRate: 93.8 },
    { date: 'Aug 21', overallScore: 96.5, syncRate: 99.2, ipfsRate: 98.8, metadataRate: 94.6 },
    { date: 'Aug 28', overallScore: 97.2, syncRate: 99.5, ipfsRate: 99.1, metadataRate: 95.8 },
  ];

  const recommendedBackfills = [
    {
      id: 'bf-spatial-01',
      title: 'Backfill 2,040 missing spatial grid boundary cell IDs in PostGIS',
      priority: 'urgent' as const,
      recordsToProcess: 2040,
      targetSystem: 'PostGIS' as const,
    },
    {
      id: 'bf-ipfs-02',
      title: 'Re-pin 1,260 unreachable IPFS blobs to secondary decentralized storage nodes',
      priority: 'recommended' as const,
      recordsToProcess: 1260,
      targetSystem: 'IPFS Gateway' as const,
    },
    {
      id: 'bf-sync-03',
      title: 'Re-index 680 missed Soroban contract emission events from block #52184200',
      priority: 'recommended' as const,
      recordsToProcess: 680,
      targetSystem: 'Stellar Indexer' as const,
    },
  ];

  return {
    overallScore,
    letterGrade,
    calculatedAt: Date.now(),
    syncAudit,
    ipfsAudit,
    metadataAudit,
    impactAnalysis,
    historicalTrend,
    recommendedBackfills,
  };
}
