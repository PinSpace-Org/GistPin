'use client';

import { useState } from 'react';

interface CorrelationMatrix {
  variables: string[];
  matrix: number[][];
}

const RAW_DATA: CorrelationMatrix = {
  variables: ['DAU', 'Tips', 'Gists', 'Sessions', 'Retention', 'Spam Rate'],
  matrix: [
    [1.00,  0.82,  0.91,  0.76,  0.68, -0.45],
    [0.82,  1.00,  0.74,  0.63,  0.59, -0.32],
    [0.91,  0.74,  1.00,  0.85,  0.71, -0.52],
    [0.76,  0.63,  0.85,  1.00,  0.78, -0.38],
    [0.68,  0.59,  0.71,  0.78,  1.00, -0.61],
    [-0.45, -0.32, -0.52, -0.38, -0.61, 1.00],
  ],
};

function getHeatColor(value: number): string {
  if (value > 0) {
    const intensity = Math.min(Math.abs(value), 1);
    return `rgba(59,130,246,${0.2 + intensity * 0.6})`;
  } else if (value < 0) {
    const intensity = Math.min(Math.abs(value), 1);
    return `rgba(239,68,68,${0.2 + intensity * 0.6})`;
  }
  return '#f3f4f6';
}

function getTextColor(value: number): string {
  return Math.abs(value) > 0.6 ? '#fff' : '#374151';
}

const INSIGHTS = [
  { pair: 'Gists ↔ DAU',      r: 0.91, insight: 'Strong positive: more gists drive user growth' },
  { pair: 'Gists ↔ Sessions', r: 0.85, insight: 'Content creation correlates with engagement' },
  { pair: 'Retention ↔ Spam', r: -0.61, insight: 'Higher spam rate reduces retention significantly' },
  { pair: 'DAU ↔ Tips',       r: 0.82, insight: 'User growth directly increases tipping volume' },
];

export default function CorrelationHeatmap() {
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const { variables, matrix } = RAW_DATA;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{ padding: 8 }}></th>
              {variables.map((v) => (
                <th
                  key={v}
                  style={{
                    padding: '8px 10px',
                    writingMode: 'vertical-lr',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#374151',
                    height: 100,
                  }}
                >
                  {v}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={variables[i]}>
                <td style={{ padding: '4px 10px', fontWeight: 600, fontSize: 11, color: '#374151', textAlign: 'right' }}>
                  {variables[i]}
                </td>
                {row.map((val, j) => {
                  const pairKey = `${variables[i]}↔${variables[j]}`;
                  return (
                    <td
                      key={pairKey}
                      onClick={() => {
                        if (i !== j) setSelectedPair(pairKey);
                      }}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'center',
                        background: getHeatColor(val),
                        color: getTextColor(val),
                        fontWeight: Math.abs(val) > 0.7 ? 700 : 500,
                        borderRadius: 4,
                        cursor: i !== j ? 'pointer' : 'default',
                        minWidth: 50,
                        fontSize: 13,
                        border: selectedPair === pairKey ? '2px solid #6366f1' : '2px solid transparent',
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 16, fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(59,130,246,0.7)', display: 'inline-block' }}></span>
          <span>Positive correlation</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 16, borderRadius: 3, background: 'rgba(239,68,68,0.7)', display: 'inline-block' }}></span>
          <span>Negative correlation</span>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>Key Insights</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {INSIGHTS.map((ins) => (
            <div
              key={ins.pair}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                fontSize: 13,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 700, color: '#6366f1', minWidth: 80 }}>{ins.pair}</span>
              <span style={{ fontWeight: 600, color: '#374151' }}>r = {ins.r}</span>
              <span style={{ color: '#6b7280' }}>{ins.insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
