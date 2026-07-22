export interface PrivacyMetric {
  label: string;
  value: number;
  target: number;
  status: 'compliant' | 'warning' | 'non-compliant';
}

export function getDataMinimizationMetrics(): PrivacyMetric[] {
  return [
    { label: 'IP addresses hashed', value: 99.8, target: 100, status: 'compliant' },
    { label: 'PII fields encrypted', value: 100, target: 100, status: 'compliant' },
    { label: 'Data retention compliance', value: 94.2, target: 95, status: 'warning' },
    { label: 'Right-to-erasure requests fulfilled', value: 100, target: 100, status: 'compliant' },
    { label: 'Consent records complete', value: 97.5, target: 100, status: 'warning' },
  ];
}

export function getAnonymousVsAttributed(): { anonymous: number; attributed: number; ratio: string } {
  const anonymous = 8420;
  const attributed = 3980;
  const ratio = (anonymous / attributed).toFixed(1);
  return { anonymous, attributed, ratio };
}

export function getIpHashUsage(): Array<{ date: string; hashed: number; plain: number }> {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return {
      date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      hashed: Math.round(95 + Math.random() * 5),
      plain: Math.round(Math.random() * 2),
    };
  });
}

export function getDataRetention(): Array<{ category: string; count: number; maxAge: number; compliant: number }> {
  return [
    { category: 'User profiles', count: 12400, maxAge: 365, compliant: 99.2 },
    { category: 'Gist content', count: 45200, maxAge: 730, compliant: 100 },
    { category: 'Analytics events', count: 890000, maxAge: 90, compliant: 96.8 },
    { category: 'Search queries', count: 234000, maxAge: 30, compliant: 98.1 },
    { category: 'Session logs', count: 67000, maxAge: 7, compliant: 100 },
  ];
}

export function getGdprScore(): { overall: number; categories: Array<{ name: string; score: number }> } {
  return {
    overall: 96.4,
    categories: [
      { name: 'Lawful basis', score: 100 },
      { name: 'Data minimization', score: 98 },
      { name: 'Storage limitation', score: 94 },
      { name: 'Right to erasure', score: 100 },
      { name: 'Data portability', score: 92 },
      { name: 'Breach notification', score: 95 },
    ],
  };
}
