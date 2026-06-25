'use client';

import { useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RegionLang {
  region: string;
  dominant: string;
  pct: number;
  gists: number;
  languages: { lang: string; pct: number }[];
}

const REGIONS: RegionLang[] = [
  {
    region: 'North America',
    dominant: 'English',
    pct: 92,
    gists: 24500,
    languages: [
      { lang: 'English', pct: 92 },
      { lang: 'Spanish', pct: 5 },
      { lang: 'French', pct: 3 },
    ],
  },
  {
    region: 'Europe',
    dominant: 'English',
    pct: 48,
    gists: 18200,
    languages: [
      { lang: 'English', pct: 48 },
      { lang: 'German', pct: 18 },
      { lang: 'French', pct: 14 },
      { lang: 'Spanish', pct: 12 },
      { lang: 'Other', pct: 8 },
    ],
  },
  {
    region: 'Asia Pacific',
    dominant: 'Japanese',
    pct: 31,
    gists: 15600,
    languages: [
      { lang: 'Japanese', pct: 31 },
      { lang: 'English', pct: 28 },
      { lang: 'Korean', pct: 18 },
      { lang: 'Chinese', pct: 15 },
      { lang: 'Other', pct: 8 },
    ],
  },
  {
    region: 'South America',
    dominant: 'Portuguese',
    pct: 45,
    gists: 8200,
    languages: [
      { lang: 'Portuguese', pct: 45 },
      { lang: 'Spanish', pct: 40 },
      { lang: 'English', pct: 15 },
    ],
  },
  {
    region: 'Africa',
    dominant: 'English',
    pct: 40,
    gists: 5400,
    languages: [
      { lang: 'English', pct: 40 },
      { lang: 'Swahili', pct: 25 },
      { lang: 'French', pct: 20 },
      { lang: 'Other', pct: 15 },
    ],
  },
  {
    region: 'Middle East',
    dominant: 'Arabic',
    pct: 52,
    gists: 3100,
    languages: [
      { lang: 'Arabic', pct: 52 },
      { lang: 'English', pct: 30 },
      { lang: 'Other', pct: 18 },
    ],
  },
];

const COLORS_BY_REGION: Record<string, string> = {
  'North America': 'rgba(59,130,246,0.8)',
  'Europe': 'rgba(34,197,94,0.8)',
  'Asia Pacific': 'rgba(251,191,36,0.8)',
  'South America': 'rgba(239,68,68,0.8)',
  'Africa': 'rgba(168,85,247,0.8)',
  'Middle East': 'rgba(236,72,153,0.8)',
};

const TOTAL_GISTS = REGIONS.reduce((s, r) => s + r.gists, 0);

export default function LanguageGlobe() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const distData = {
    labels: REGIONS.map((r) => `${r.region} (${Math.round((r.gists / TOTAL_GISTS) * 100)}%)`),
    datasets: [{
      data: REGIONS.map((r) => r.gists),
      backgroundColor: REGIONS.map((r) => COLORS_BY_REGION[r.region]),
      borderWidth: 0,
    }],
  };

  const activeRegion = REGIONS.find((r) => r.region === selectedRegion) ?? REGIONS[0];
  const activeLangData = {
    labels: activeRegion.languages.map((l) => l.lang),
    datasets: [{
      data: activeRegion.languages.map((l) => l.pct),
      backgroundColor: ['rgba(99,102,241,0.8)', 'rgba(14,165,233,0.8)', 'rgba(34,197,94,0.8)', 'rgba(251,191,36,0.8)', 'rgba(239,68,68,0.8)'],
      borderWidth: 0,
    }],
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Gists by Region</h3>
          <Pie data={distData} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Region Selector</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {REGIONS.map((r) => (
              <button
                key={r.region}
                onClick={() => setSelectedRegion(r.region)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: selectedRegion === r.region ? COLORS_BY_REGION[r.region] : '#e5e7eb',
                  background: selectedRegion === r.region ? `${COLORS_BY_REGION[r.region]}20` : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: selectedRegion === r.region ? 700 : 500 }}>{r.region}</span>
                <span style={{ color: '#6b7280' }}>
                  {r.dominant} — {r.pct}%
                </span>
              </button>
            ))}
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
              {activeRegion.region} Language Breakdown
            </h4>
            <Pie data={activeLangData} />
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Language Legend</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {Array.from(new Set(REGIONS.flatMap((r) => r.languages.map((l) => l.lang)))).map((lang) => (
            <span
              key={lang}
              style={{
                padding: '3px 10px',
                borderRadius: 12,
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                fontSize: 12,
              }}
            >
              {lang}
            </span>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
          Interactive 3D globe available with react-globe.gl (add dep and import Globe from react-globe.gl).
        </p>
      </div>
    </div>
  );
}
