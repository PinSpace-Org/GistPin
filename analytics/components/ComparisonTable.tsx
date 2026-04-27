'use client';

export interface ComparisonRow {
  metric: string;
  current: number;
  previous: number;
  delta: number;
  pctChange: number;
}

interface ComparisonTableProps {
  rows: ComparisonRow[];
  currentLabel: string;
  previousLabel: string;
}

export default function ComparisonTable({ rows, currentLabel, previousLabel }: ComparisonTableProps) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '12px 10px' }}>Metric</th>
            <th style={{ textAlign: 'left', padding: '12px 10px' }}>{currentLabel}</th>
            <th style={{ textAlign: 'left', padding: '12px 10px' }}>{previousLabel}</th>
            <th style={{ textAlign: 'left', padding: '12px 10px' }}>Delta</th>
            <th style={{ textAlign: 'left', padding: '12px 10px' }}>% Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const improved = row.delta >= 0;
            return (
              <tr key={row.metric} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={{ padding: '14px 10px', fontWeight: 700 }}>{row.metric}</td>
                <td style={{ padding: '14px 10px' }}>{row.current}</td>
                <td style={{ padding: '14px 10px' }}>{row.previous}</td>
                <td style={{ padding: '14px 10px', color: improved ? '#15803d' : '#b91c1c' }}>
                  {improved ? '↑' : '↓'} {row.delta}
                </td>
                <td style={{ padding: '14px 10px', color: improved ? '#15803d' : '#b91c1c' }}>
                  {row.pctChange}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
