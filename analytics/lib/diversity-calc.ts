export interface RegionDiversity {
  region: string;
  country: string;
  diversityScore: number;
  languageCount: number;
  topicCount: number;
  gistCount: number;
  topLanguages: { name: string; share: number }[];
  topTopics: { name: string; share: number }[];
  isLowDiversity: boolean;
  alertMessage: string | null;
}

export interface DiversityTrend {
  month: string;
  overallScore: number;
  languageDiversity: number;
  topicDiversity: number;
}

export interface LanguageBreakdown {
  language: string;
  regionShares: { region: string; share: number }[];
  globalShare: number;
  entropy: number;
}

const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'Rust', 'Go', 'Solidity', 'Haskell', 'Java', 'C++', 'Ruby'];
const TOPICS = ['Web3', 'DeFi', 'NFT', 'Smart Contracts', 'IPFS', 'DAO', 'L2 Scaling', 'ZK Proofs', 'Cross-chain', 'Tooling'];

function shannonEntropy(values: number[]): number {
  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return -values.reduce((sum, v) => {
    if (v === 0) return sum;
    const p = v / total;
    return sum + p * Math.log2(p);
  }, 0);
}

function normalizeEntropy(entropy: number, maxPossible: number): number {
  return maxPossible > 0 ? (entropy / maxPossible) * 100 : 0;
}

export function calculateRegionDiversity(): RegionDiversity[] {
  const regions: { region: string; country: string }[] = [
    { region: 'North America', country: 'United States' },
    { region: 'North America', country: 'Canada' },
    { region: 'Europe', country: 'Germany' },
    { region: 'Europe', country: 'France' },
    { region: 'Europe', country: 'Netherlands' },
    { region: 'Asia Pacific', country: 'Japan' },
    { region: 'Asia Pacific', country: 'India' },
    { region: 'Asia Pacific', country: 'Singapore' },
    { region: 'South America', country: 'Brazil' },
    { region: 'Africa', country: 'Nigeria' },
    { region: 'Middle East', country: 'UAE' },
  ];

  return regions.map(({ region, country }) => {
    const languageShares = LANGUAGES.slice(0, 3 + Math.floor(Math.random() * 5)).map(() => Math.random());
    const langTotal = languageShares.reduce((a, b) => a + b, 0);
    const normalizedLang = languageShares.map((v) => v / langTotal);
    const topicShares = TOPICS.slice(0, 2 + Math.floor(Math.random() * 4)).map(() => Math.random());
    const topicTotal = topicShares.reduce((a, b) => a + b, 0);
    const normalizedTopic = topicShares.map((v) => v / topicTotal);

    const langEntropy = shannonEntropy(normalizedLang);
    const topicEntropy = shannonEntropy(normalizedTopic);
    const maxLangEntropy = Math.log2(LANGUAGES.length);
    const maxTopicEntropy = Math.log2(TOPICS.length);

    const langDiversity = normalizeEntropy(langEntropy, maxLangEntropy);
    const topicDiversity = normalizeEntropy(topicEntropy, maxTopicEntropy);
    const diversityScore = Math.round((langDiversity * 0.5 + topicDiversity * 0.5) * 10) / 10;
    const isLowDiversity = diversityScore < 45;

    return {
      region,
      country,
      diversityScore,
      languageCount: normalizedLang.length,
      topicCount: normalizedTopic.length,
      gistCount: Math.round(100 + Math.random() * 900),
      topLanguages: LANGUAGES.slice(0, normalizedLang.length).map((name, i) => ({
        name,
        share: Math.round(normalizedLang[i] * 1000) / 10,
      })).sort((a, b) => b.share - a.share),
      topTopics: TOPICS.slice(0, normalizedTopic.length).map((name, i) => ({
        name,
        share: Math.round(normalizedTopic[i] * 1000) / 10,
      })).sort((a, b) => b.share - a.share),
      isLowDiversity,
      alertMessage: isLowDiversity
        ? `${country} has low diversity — only ${normalizedLang.length} languages detected`
        : null,
    };
  });
}

export function getDiversityTrend(): DiversityTrend[] {
  return [
    { month: 'Jan', overallScore: 62.3, languageDiversity: 58.1, topicDiversity: 66.5 },
    { month: 'Feb', overallScore: 63.8, languageDiversity: 59.4, topicDiversity: 68.2 },
    { month: 'Mar', overallScore: 65.1, languageDiversity: 61.2, topicDiversity: 69.0 },
    { month: 'Apr', overallScore: 66.7, languageDiversity: 63.0, topicDiversity: 70.4 },
    { month: 'May', overallScore: 68.2, languageDiversity: 64.8, topicDiversity: 71.6 },
    { month: 'Jun', overallScore: 69.5, languageDiversity: 66.1, topicDiversity: 72.9 },
  ];
}

export function getLanguageBreakdown(): LanguageBreakdown[] {
  const regionNames = ['NA', 'EU', 'APAC', 'LATAM', 'MEA'];
  return LANGUAGES.slice(0, 6).map((language) => {
    const regionShares = regionNames.map(() => Math.round(Math.random() * 300) / 10);
    const globalShare = Math.round(regionShares.reduce((a, b) => a + b, 0) / regionNames.length * 10) / 10;
    return { language, regionShares: regionNames.map((region, i) => ({ region, share: regionShares[i] })), globalShare, entropy: parseFloat((Math.random() * 0.8 + 0.2).toFixed(3)) };
  });
}

export function getLowDiversityAlerts(regions: RegionDiversity[]) {
  return regions.filter((r) => r.isLowDiversity);
}
