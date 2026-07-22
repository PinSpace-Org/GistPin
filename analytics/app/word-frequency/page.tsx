'use client';

import React, { useState, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Download, TrendingUp, Filter, MapPin } from 'lucide-react';
import {
  analyzeWordFrequency,
  getTrendingWords,
  getLocationWordTrends,
  exportWordData,
  type WordFrequencyEntry,
  type TrendingWord,
  type LocationWordEntry,
} from '@/lib/word-tracker';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SAMPLE_TEXTS = [
  'TypeScript React hooks useEffect useState performance optimization',
  'Docker containerization Kubernetes deployment microservices architecture',
  'machine learning neural network deep learning Python TensorFlow',
  'REST API GraphQL database PostgreSQL MongoDB indexing queries',
  'git branching strategy CI/CD pipeline GitHub Actions automation',
  'CSS Grid Flexbox responsive design mobile first accessibility',
  'React component lifecycle state management Redux Context API',
  'Node.js Express middleware authentication JWT token security',
  'cloud computing AWS Lambda serverless functions API Gateway',
  'TypeScript generics utility types conditional types mapped types',
];

const SAMPLE_LOCATIONS = [
  'San Francisco, CA',
  'New York, NY',
  'London, UK',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Toronto, Canada',
  'Sydney, Australia',
  'Singapore',
  'Amsterdam, Netherlands',
  'Remote',
];

export default function WordFrequencyPage() {
  const [texts] = useState<string[]>(SAMPLE_TEXTS);
  const [locations] = useState<string[]>(SAMPLE_LOCATIONS);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [topN, setTopN] = useState(10);

  const wordEntries = useMemo(() => analyzeWordFrequency(texts), [texts]);
  const trendingWords = useMemo(() => getTrendingWords(wordEntries, selectedPeriod), [wordEntries, selectedPeriod]);
  const locationTrends = useMemo(() => getLocationWordTrends(texts, locations), [texts, locations]);

  const topWords = wordEntries.slice(0, topN);

  const barChartData = {
    labels: topWords.map(w => w.word),
    datasets: [
      {
        label: 'Word Frequency',
        data: topWords.map(w => w.count),
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Top Word Frequencies', color: '#e2e8f0', font: { size: 16 } },
    },
    scales: {
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148,163,184,0.1)' } },
      x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
    },
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#e2e8f0', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
              Word Frequency Tracker
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              Track word frequency trends across gist content
            </p>
          </div>
          <button
            onClick={() => exportWordData(wordEntries, 'csv')}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', backgroundColor: '#6366f1', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
            }}
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Filter size={18} color="#6366f1" />
              <span style={{ fontWeight: 600 }}>Filters</span>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Period</label>
                <select
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(e.target.value as 'day' | 'week' | 'month')}
                  style={{
                    padding: '8px 12px', backgroundColor: '#0f172a', color: '#e2e8f0',
                    border: '1px solid #334155', borderRadius: '6px', fontSize: '14px',
                  }}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Top N</label>
                <select
                  value={topN}
                  onChange={e => setTopN(Number(e.target.value))}
                  style={{
                    padding: '8px 12px', backgroundColor: '#0f172a', color: '#e2e8f0',
                    border: '1px solid #334155', borderRadius: '6px', fontSize: '14px',
                  }}
                >
                  {[5, 10, 15, 20].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={18} color="#6366f1" />
              <span style={{ fontWeight: 600 }}>Quick Stats</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#6366f1' }}>{wordEntries.length}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Unique Words</div>
              </div>
              <div style={{ textAlign: 'center', padding: '8px', backgroundColor: '#0f172a', borderRadius: '8px' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#10b981' }}>
                  {trendingWords.filter(w => w.direction === 'up').length}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Trending Up</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', height: '400px' }}>
            <div style={{ height: '350px' }}>
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', overflow: 'auto', maxHeight: '400px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} color="#6366f1" /> Trending Words ({selectedPeriod})
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', color: '#94a3b8' }}>Word</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', color: '#94a3b8' }}>Current</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', color: '#94a3b8' }}>Previous</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', color: '#94a3b8' }}>Change</th>
                </tr>
              </thead>
              <tbody>
                {trendingWords.slice(0, 15).map(tw => (
                  <tr key={tw.word} style={{ borderBottom: '1px solid rgba(51,65,85,0.5)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 500 }}>{tw.word}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>{tw.currentCount}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: '#94a3b8' }}>{tw.previousCount}</td>
                    <td style={{
                      padding: '8px 4px', textAlign: 'right', fontWeight: 600,
                      color: tw.direction === 'up' ? '#10b981' : tw.direction === 'down' ? '#ef4444' : '#94a3b8',
                    }}>
                      {tw.changePercent > 0 ? '+' : ''}{tw.changePercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="#6366f1" /> Location-Specific Word Trends
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {locationTrends.map(lt => (
              <div key={lt.location} style={{ backgroundColor: '#0f172a', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>{lt.location}</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {lt.words.slice(0, 8).map(w => (
                    <span
                      key={w.word}
                      style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '12px',
                        backgroundColor: `rgba(99,102,241,${Math.min(0.15 + w.percentage * 0.02, 0.8)})`,
                        color: '#e2e8f0',
                      }}
                    >
                      {w.word} ({w.count})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
