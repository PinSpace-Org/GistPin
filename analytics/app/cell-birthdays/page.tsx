'use client';

import CellAgeMap from '@/components/charts/CellAgeMap';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

const sampleCells = [
  { geohash: 'u09tvq0', lat: 40.7128, lng: -74.0060, gistCount: 2841, ageDays: 3, lastActivity: '2026-07-28' },
  { geohash: 'u09tvq1', lat: 40.7130, lng: -74.0058, gistCount: 1562, ageDays: 12, lastActivity: '2026-07-20' },
  { geohash: 'u09tvq2', lat: 40.7132, lng: -74.0056, gistCount: 892, ageDays: 45, lastActivity: '2026-06-15' },
  { geohash: 'u09tvq3', lat: 40.7126, lng: -74.0062, gistCount: 3421, ageDays: 1, lastActivity: '2026-07-29' },
  { geohash: 'u09tvq4', lat: 40.7124, lng: -74.0064, gistCount: 723, ageDays: 89, lastActivity: '2026-05-01' },
  { geohash: 'u09tvq5', lat: 40.7134, lng: -74.0054, gistCount: 456, ageDays: 180, lastActivity: '2026-01-30' },
  { geohash: 'u09tvq6', lat: 40.7118, lng: -74.0070, gistCount: 98, ageDays: 365, lastActivity: '2025-07-30' },
  { geohash: 'u09tvq7', lat: 40.7140, lng: -74.0050, gistCount: 2100, ageDays: 7, lastActivity: '2026-07-22' },
  { geohash: 'u09tvq8', lat: 40.7120, lng: -74.0068, gistCount: 567, ageDays: 30, lastActivity: '2026-06-29' },
  { geohash: 'u09tvq9', lat: 40.7138, lng: -74.0052, gistCount: 1890, ageDays: 60, lastActivity: '2026-05-30' },
  { geohash: 'u09tvr0', lat: 40.7150, lng: -74.0040, gistCount: 3045, ageDays: 2, lastActivity: '2026-07-27' },
  { geohash: 'u09tvr1', lat: 40.7148, lng: -74.0042, gistCount: 1234, ageDays: 14, lastActivity: '2026-07-15' },
  { geohash: 'u09tvr2', lat: 40.7146, lng: -74.0044, gistCount: 678, ageDays: 90, lastActivity: '2026-04-30' },
  { geohash: 'u09tvr3', lat: 40.7152, lng: -74.0038, gistCount: 2345, ageDays: 5, lastActivity: '2026-07-24' },
  { geohash: 'u09tvr4', lat: 40.7144, lng: -74.0046, gistCount: 432, ageDays: 200, lastActivity: '2026-01-10' },
  { geohash: 'u09tvr5', lat: 40.7154, lng: -74.0036, gistCount: 1567, ageDays: 21, lastActivity: '2026-07-08' },
  { geohash: 'u09tvr6', lat: 40.7136, lng: -74.0058, gistCount: 890, ageDays: 150, lastActivity: '2026-03-01' },
  { geohash: 'u09tvr7', lat: 40.7142, lng: -74.0048, gistCount: 210, ageDays: 400, lastActivity: '2025-06-24' },
  { geohash: 'u09tvr8', lat: 40.7156, lng: -74.0034, gistCount: 2789, ageDays: 4, lastActivity: '2026-07-25' },
  { geohash: 'u09tvr9', lat: 40.7135, lng: -74.0055, gistCount: 3456, ageDays: 0, lastActivity: '2026-07-29' },
  { geohash: 'u09tvs0', lat: 34.0522, lng: -118.2437, gistCount: 1890, ageDays: 10, lastActivity: '2026-07-19' },
  { geohash: 'u09tvs1', lat: 34.0524, lng: -118.2435, gistCount: 2340, ageDays: 6, lastActivity: '2026-07-23' },
  { geohash: 'u09tvs2', lat: 34.0520, lng: -118.2439, gistCount: 567, ageDays: 75, lastActivity: '2026-05-15' },
  { geohash: 'u09tvs3', lat: 34.0526, lng: -118.2433, gistCount: 1234, ageDays: 20, lastActivity: '2026-07-09' },
  { geohash: 'u09tvs4', lat: 34.0518, lng: -118.2441, gistCount: 345, ageDays: 250, lastActivity: '2025-11-22' },
  { geohash: 'u09tvs5', lat: 51.5074, lng: -0.1278, gistCount: 4567, ageDays: 1, lastActivity: '2026-07-28' },
  { geohash: 'u09tvs6', lat: 51.5076, lng: -0.1276, gistCount: 2890, ageDays: 8, lastActivity: '2026-07-21' },
  { geohash: 'u09tvs7', lat: 51.5072, lng: -0.1280, gistCount: 1678, ageDays: 35, lastActivity: '2026-06-24' },
  { geohash: 'u09tvs8', lat: 51.5078, lng: -0.1274, gistCount: 901, ageDays: 120, lastActivity: '2026-03-31' },
  { geohash: 'u09tvs9', lat: 51.5070, lng: -0.1282, gistCount: 234, ageDays: 300, lastActivity: '2025-10-03' },
];

export default function CellBirthdaysPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{
        background: 'linear-gradient(135deg,#ffffff 0%,#f0fdf4 100%)',
        borderRadius: 24, padding: '28px 28px 24px',
        boxShadow: '0 12px 40px rgba(15,23,42,0.07)', marginBottom: 28,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', borderRadius: 999,
          padding: '5px 12px', background: '#22c55e', color: '#fff',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Cell Birthdays</div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: 30, fontWeight: 800 }}>Geohash Cell Birthday Tracker</h1>
            <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
              Track the age and activity of geohash cells across the GistPin platform. Identify aging cells with declining activity.
            </p>
          </div>
          <ExportButton
            onExport={(onProgress) =>
              exportRowsToCsv({
                filenamePrefix: 'cell-birthdays',
                rows: sampleCells.map((c) => ({ geohash: c.geohash, lat: c.lat, lng: c.lng, age_days: c.ageDays, gist_count: c.gistCount, last_activity: c.lastActivity })),
                onProgress,
              })
            }
          />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 22, padding: 24, border: '1px solid rgba(148,163,184,0.16)' }}>
        <CellAgeMap cells={sampleCells} />
      </div>
    </main>
  );
}
