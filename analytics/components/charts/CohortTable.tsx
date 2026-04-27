'use client';

export interface CohortRow {
  cohort: string; // e.g. "2024-W01"
  size: number;
  retention: (number | null)[]; // weeks 0-12, percentage 0-100
}

interface CohortTableProps {
  rows: CohortRow[];
}

function retentionColor(pct: number): string {
  if (pct >= 80) return '#166534';
  if (pct >= 60) return '#15803d';
  if (pct >= 40) return '#4ade80';
  if (pct >= 20) return '#bbf7d0';
  return '#f0fdf4';
}

function textColor(pct: number): string {
  return pct >= 40 ? '#ffffff' : '#166534';
}

const WEEKS = Array.from({ length: 13 }, (_, i) => i); // 0-12

export default function CohortTable({ rows }: CohortTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'collapse',
          fontSize: 13,
          minWidth: 900,
          width: '100%',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                position: 'sticky',
                left: 0,
                background: '#f8fafc',
                zIndex: 1,
                padding: '10px 14px',
                textAlign: 'left',
                fontWeight: 700,
                borderBottom: '2px solid #e2e8f0',
                whiteSpace: 'nowrap',
              }}
            >
              Cohort
            </th>
            <th
              style={{
                padding: '10px 14px',
                textAlign: 'right',
                fontWeight: 700,
                borderBottom: '2px solid #e2e8f0',
                whiteSpace: 'nowrap',
              }}
            >
              Users
            </th>
            {WEEKS.map((w) => (
              <th
                key={w}
                style={{
                  padding: '10px 10px',
                  textAlign: 'center',
                  fontWeight: 700,
                  borderBottom: '2px solid #e2e8f0',
                  whiteSpace: 'nowrap',
                  color: '#64748b',
                }}
              >
                Wk {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.cohort}>
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  background: '#ffffff',
                  zIndex: 1,
                  padding: '8px 14px',
                  fontWeight: 600,
                  borderBottom: '1px solid #f1f5f9',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.cohort}
              </td>
              <td
                style={{
                  padding: '8px 14px',
                  textAlign: 'right',
                  borderBottom: '1px solid #f1f5f9',
                  color: '#475569',
                }}
              >
                {row.size.toLocaleString()}
              </td>
              {WEEKS.map((w) => {
                const pct = row.retention[w];
                return (
                  <td
                    key={w}
                    style={{
                      padding: '8px 10px',
                      textAlign: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      background: pct != null ? retentionColor(pct) : 'transparent',
                      color: pct != null ? textColor(pct) : '#cbd5e1',
                      fontWeight: pct != null ? 600 : 400,
                      borderRadius: 6,
                    }}
                  >
                    {pct != null ? `${pct}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
