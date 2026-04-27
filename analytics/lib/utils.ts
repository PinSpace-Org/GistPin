import type { Category, GistData } from '@/types';

export const categories = ['Tech', 'Finance', 'AI', 'Web3'];

export function generateGistData(count = 500): GistData[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: `gist-${i}`,
    age: Math.floor(Math.random() * 365),
    engagement: Math.floor(Math.random() * 1000),
    category: categories[Math.floor(Math.random() * categories.length)] as Category,
  }));
}

export function regression(data: GistData[]) {
  const n = data.length;
  const sumX = data.reduce((a, b) => a + b.age, 0);
  const sumY = data.reduce((a, b) => a + b.engagement, 0);
  const sumXY = data.reduce((a, b) => a + b.age * b.engagement, 0);
  const sumXX = data.reduce((a, b) => a + b.age * b.age, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
