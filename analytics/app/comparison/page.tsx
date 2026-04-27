'use client';

import { jsPDF } from 'jspdf';
import { useMemo, useState } from 'react';
import ComparisonTable, { type ComparisonRow } from '@/components/ComparisonTable';

interface PeriodMetrics {
  totalGists: number;
  activeUsers: number;
  engagementRate: number;
  topLocations: number;
}

function daysBetween(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.max(1, Math.round(diff / 86_400_000) + 1);
}

function generateMetrics(start: string, end: string, offset: number): PeriodMetrics {
  const span = daysBetween(start, end);

  return {
    totalGists: 120 + span * 4 + offset * 9,
    activeUsers: 72 + span * 3 + offset * 5,
    engagementRate: Number((18 + span * 0.7 + offset * 1.4).toFixed(1)),
    topLocations: 6 + Math.floor(span / 5) + offset,
  };
}

function buildComparisonRows(current: PeriodMetrics, previous: PeriodMetrics): ComparisonRow[] {
  return [
    { metric: 'Total gists', current: current.totalGists, previous: previous.totalGists, delta: 0, pctChange: 0 },
    { metric: 'Active users', current: current.activeUsers, previous: previous.activeUsers, delta: 0, pctChange: 0 },
    { metric: 'Engagement rate', current: current.engagementRate, previous: previous.engagementRate, delta: 0, pctChange: 0 },
    { metric: 'Top locations', current: current.topLocations, previous: previous.topLocations, delta: 0, pctChange: 0 },
  ].map((row) => {
    const delta = Number((row.current - row.previous).toFixed(1));
    const pctChange = row.previous === 0 ? 0 : Number((((row.current - row.previous) / row.previous) * 100).toFixed(1));

    return {
      ...row,
      delta,
      pctChange,
    };
  });
}

function downloadCsv(rows: ComparisonRow[], leftLabel: string, rightLabel: string) {
  const lines = [
    ['Metric', leftLabel, rightLabel, 'Delta', '% Change'].join(','),
    ...rows.map((row) => [row.metric, row.current, row.previous, row.delta, row.pctChange].join(',')),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `comparison-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadPdf(rows: ComparisonRow[], leftLabel: string, rightLabel: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, 210, 26, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('GistPin Comparison Report', 14, 16);

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Current period: ${leftLabel}`, 14, 38);
  pdf.text(`Comparison period: ${rightLabel}`, 14, 45);

  let y = 60;
  rows.forEach((row) => {
    const direction = row.delta >= 0 ? 'UP' : 'DOWN';
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, y - 6, 182, 18, 3, 3);
    pdf.setFont('helvetica', 'bold');
    pdf.text(row.metric, 18, y + 1);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${row.current} vs ${row.previous}`, 80, y + 1);
    pdf.text(`Delta: ${row.delta}`, 122, y + 1);
    pdf.text(`${direction} ${row.pctChange}%`, 158, y + 1);
    y += 24;
  });

  pdf.save(`comparison-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function ComparisonPage() {
  const [currentStart, setCurrentStart] = useState('2026-03-01');
  const [currentEnd, setCurrentEnd] = useState('2026-03-28');
  const [previousStart, setPreviousStart] = useState('2026-02-01');
  const [previousEnd, setPreviousEnd] = useState('2026-02-28');

  const currentMetrics = useMemo(
    () => generateMetrics(currentStart, currentEnd, 2),
    [currentStart, currentEnd],
  );
  const previousMetrics = useMemo(
    () => generateMetrics(previousStart, previousEnd, 0),
    [previousStart, previousEnd],
  );
  const rows = useMemo(
    () => buildComparisonRows(currentMetrics, previousMetrics),
    [currentMetrics, previousMetrics],
  );

  const currentLabel = `${currentStart} to ${currentEnd}`;
  const previousLabel = `${previousStart} to ${previousEnd}`;

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '40px 24px 64px',
      }}
    >
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          background: 'linear-gradient(135deg, #ffffff 0%, #fef3c7 100%)',
          borderRadius: 28,
          padding: '30px 30px 26px',
          boxShadow: '0 18px 46px rgba(15,23,42,0.08)',
          marginBottom: 28,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              padding: '6px 12px',
              background: '#92400e',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Period Comparison
          </div>

          <h1 style={{ margin: '0 0 8px', fontSize: 38, lineHeight: 1.05 }}>
            Comparison report generator
          </h1>

          <p style={{ margin: 0, color: '#475569', fontSize: 16, maxWidth: 700 }}>
            Compare two time periods side by side, inspect changes visually, and export the
            report as CSV or PDF for sharing.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => downloadCsv(rows, currentLabel, previousLabel)}
            style={{
              border: 'none',
              borderRadius: 999,
              background: '#1d4ed8',
              color: '#ffffff',
              padding: '12px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => downloadPdf(rows, currentLabel, previousLabel)}
            style={{
              border: 'none',
              borderRadius: 999,
              background: '#111827',
              color: '#ffffff',
              padding: '12px 16px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Export PDF
          </button>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: '22px',
            border: '1px solid rgba(148,163,184,0.16)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Current period</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Start date</span>
              <input type="date" value={currentStart} onChange={(event) => setCurrentStart(event.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>End date</span>
              <input type="date" value={currentEnd} onChange={(event) => setCurrentEnd(event.target.value)} />
            </label>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: '22px',
            border: '1px solid rgba(148,163,184,0.16)',
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: 22 }}>Comparison period</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Start date</span>
              <input type="date" value={previousStart} onChange={(event) => setPreviousStart(event.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>End date</span>
              <input type="date" value={previousEnd} onChange={(event) => setPreviousEnd(event.target.value)} />
            </label>
          </div>
        </div>
      </section>

      <section
        style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px',
          border: '1px solid rgba(148,163,184,0.16)',
          boxShadow: '0 14px 36px rgba(15,23,42,0.08)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 24 }}>Side-by-side comparison</h2>
        <ComparisonTable rows={rows} currentLabel={currentLabel} previousLabel={previousLabel} />
      </section>
    </main>
  );
}
