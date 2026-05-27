'use client';

import { useMemo, useState } from 'react';
import {
  attribute,
  revenueByChannel,
  MOCK_TOUCHES,
  MODELS,
  type AttributionModel,
} from '@/lib/attribution';

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AttributionPage() {
  const [model, setModel] = useState<AttributionModel>('linear');
  const [compareModel, setCompareModel] = useState<AttributionModel>('last-touch');
  const [showCompare, setShowCompare] = useState(false);

  const results = useMemo(() => attribute(MOCK_TOUCHES, model), [model]);
  const compareResults = useMemo(() => attribute(MOCK_TOUCHES, compareModel), [compareModel]);
  const rawRevenue = useMemo(() => revenueByChannel(MOCK_TOUCHES), []);

  const totalRevenue = MOCK_TOUCHES.reduce((s, t) => s + t.revenue, 0);
  const channels = results.map((r) => r.channel);

  const selectedModel = MODELS.find((m) => m.value === model)!;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Revenue Attribution</h1>
      <p style={{ color: '#475569', marginBottom: 28 }}>
        Multi-touch attribution across channels. Total revenue:{' '}
        <strong>${totalRevenue.toLocaleString()}</strong>
      </p>

      {/* Model selector */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {MODELS.map((m) => (
            <button
              key={m.value}
              onClick={() => setModel(m.value)}
              aria-pressed={model === m.value}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: model === m.value ? '#6366f1' : '#e2e8f0',
                background: model === m.value ? '#6366f1' : '#fff',
                color: model === m.value ? '#fff' : '#475569',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{selectedModel.description}</p>
      </div>

      {/* Attribution bars */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Revenue by Channel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {results
            .sort((a, b) => b.revenue - a.revenue)
            .map((r, i) => (
              <div key={r.channel}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    marginBottom: 5,
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{r.channel}</span>
                  <span style={{ color: '#475569' }}>
                    ${r.revenue.toFixed(0)} &nbsp;
                    <span style={{ color: '#94a3b8' }}>({(r.credit * 100).toFixed(1)}%)</span>
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    borderRadius: 6,
                    background: '#f1f5f9',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${r.credit * 100}%`,
                      background: COLORS[i % COLORS.length],
                      borderRadius: 6,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Touch point timeline */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: 24,
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Touch Point Timeline</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 8 }}>
          {MOCK_TOUCHES.map((t, i) => {
            const color = COLORS[channels.indexOf(t.channel) % COLORS.length];
            const daysAgo = Math.round((Date.now() - t.timestamp) / 86400_000);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 100 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                    title={t.channel}
                  >
                    {t.channel.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center', maxWidth: 80 }}>
                    {t.channel}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{daysAgo}d ago</div>
                </div>
                {i < MOCK_TOUCHES.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: '#e2e8f0', minWidth: 20 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Model comparison */}
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(15,23,42,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Model Comparison</h2>
          <button
            onClick={() => setShowCompare((v) => !v)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: showCompare ? '#f1f5f9' : '#fff',
              fontSize: 13,
              cursor: 'pointer',
              color: '#475569',
            }}
          >
            {showCompare ? 'Hide' : 'Compare'}
          </button>
        </div>

        {showCompare && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#64748b', marginRight: 8 }}>Compare with:</label>
              <select
                value={compareModel}
                onChange={(e) => setCompareModel(e.target.value as AttributionModel)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  color: '#1e293b',
                }}
              >
                {MODELS.filter((m) => m.value !== model).map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Channel</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#64748b', fontWeight: 600 }}>Raw Revenue</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#6366f1', fontWeight: 600 }}>
                      {selectedModel.label}
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: '#06b6d4', fontWeight: 600 }}>
                      {MODELS.find((m) => m.value === compareModel)?.label}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => {
                    const a = results.find((r) => r.channel === ch);
                    const b = compareResults.find((r) => r.channel === ch);
                    return (
                      <tr key={ch} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#1e293b' }}>{ch}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#475569' }}>
                          ${rawRevenue[ch]?.toFixed(0) ?? '0'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#6366f1', fontWeight: 600 }}>
                          ${a?.revenue.toFixed(0) ?? '0'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#06b6d4', fontWeight: 600 }}>
                          ${b?.revenue.toFixed(0) ?? '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!showCompare && (
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Click Compare to see how different attribution models distribute revenue across channels.
          </p>
        )}
      </div>
    </main>
  );
}
