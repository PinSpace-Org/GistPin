'use client';

import { useState } from 'react';
import ExperimentCard, { type Experiment } from '@/components/ExperimentCard';

const INITIAL_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-1',
    name: 'New signup flow',
    status: 'active',
    variants: [
      { name: 'Control', visitors: 4200, conversions: 840 },
      { name: 'Variant B', visitors: 4150, conversions: 912 },
    ],
    winner: null,
  },
  {
    id: 'exp-2',
    name: 'Gist character limit',
    status: 'active',
    variants: [
      { name: '280 chars', visitors: 3800, conversions: 1140 },
      { name: '500 chars', visitors: 3750, conversions: 1050 },
    ],
    winner: null,
  },
  {
    id: 'exp-3',
    name: 'Map zoom level',
    status: 'completed',
    variants: [
      { name: 'Zoom 12', visitors: 5100, conversions: 1530 },
      { name: 'Zoom 14', visitors: 5050, conversions: 1868 },
    ],
    winner: 'B',
  },
];

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>(INITIAL_EXPERIMENTS);

  const declareWinner = (id: string, winner: 'A' | 'B') => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, winner, status: 'completed' } : e)),
    );
  };

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>A/B Test Results</h1>
      <p style={{ color: '#475569', marginBottom: 32 }}>
        Experiment performance metrics and statistical significance.
      </p>
      <div style={{ display: 'grid', gap: 20 }}>
        {experiments.map((exp) => (
          <ExperimentCard key={exp.id} experiment={exp} onDeclareWinner={declareWinner} />
        ))}
      </div>
    </main>
  );
}
