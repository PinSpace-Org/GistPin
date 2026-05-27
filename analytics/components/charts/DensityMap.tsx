'use client';

import { useState } from 'react';
import { exportRowsToCsv } from '@/lib/export';
import ExportButton from '@/components/ui/ExportButton';

// Mock country data: ISO-3166-1 alpha-2 → { users, region }
const countryData: Record<string, { name: string; users: number; region: string }> = {
  US: { name: 'United States',   users: 48210, region: 'Americas'      },
  GB: { name: 'United Kingdom',  users: 18430, region: 'Europe'        },
  DE: { name: 'Germany',         users: 14320, region: 'Europe'        },
  FR: { name: 'France',          users: 12870, region: 'Europe'        },
  IN: { name: 'India',           users: 11540, region: 'Asia-Pacific'  },
  CA: { name: 'Canada',          users:  9870, region: 'Americas'      },
  AU: { name: 'Australia',       users:  8210, region: 'Asia-Pacific'  },
  BR: { name: 'Brazil',          users:  7640, region: 'Americas'      },
  JP: { name: 'Japan',           users:  6980, region: 'Asia-Pacific'  },
  NL: { name: 'Netherlands',     users:  5430, region: 'Europe'        },
  SG: { name: 'Singapore',       users:  4870, region: 'Asia-Pacific'  },
  NG: { name: 'Nigeria',         users:  4210, region: 'Africa'        },
  ZA: { name: 'South Africa',    users:  3540, region: 'Africa'        },
  MX: { name: 'Mexico',          users:  3210, region: 'Americas'      },
  KR: { name: 'South Korea',     users:  2980, region: 'Asia-Pacific'  },
  SE: { name: 'Sweden',          users:  2640, region: 'Europe'        },
  PL: { name: 'Poland',          users:  2310, region: 'Europe'        },
  AR: { name: 'Argentina',       users:  1980, region: 'Americas'      },
  EG: { name: 'Egypt',           users:  1740, region: 'Africa'        },
  PH: { name: 'Philippines',     users:  1520, region: 'Asia-Pacific'  },
};

const maxUsers = Math.max(...Object.values(countryData).map((c) => c.users));

function densityColor(users: number): string {
  const t = users / maxUsers;
  if (t > 0.8) return '#1e40af';
  if (t > 0.6) return '#2563eb';
  if (t > 0.4) return '#3b82f6';
  if (t > 0.2) return '#93c5fd';
  if (t > 0.05) return '#bfdbfe';
  return '#dbeafe';
}

const regions = ['All', ...Array.from(new Set(Object.values(countryData).map((c) => c.region))).sort()];

export default function DensityMap() {
  const [filter, setFilter] = useState('All');
  const [tooltip, setTooltip] = useState<{ name: string; users: number; region: string } | null>(null);

  const rows = Object.entries(countryData)
    .filter(([, c]) => filter === 'All' || c.region === filter)
    .sort(([, a], [, b]) => b.users - a.users);

  const totalUsers = rows.reduce((s, [, c]) => s + c.users, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          {regions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                filter === r
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-900 text-gray-600 border-gray-200 hover:border-blue-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <ExportButton
          onExport={(onProgress) =>
            exportRowsToCsv({
              filenamePrefix: 'user-density',
              rows: rows.map(([code, c]) => ({
                country_code: code,
                country: c.name,
                region: c.region,
                users: c.users,
              })),
              onProgress,
            })
          }
        />
      </div>

      {/* Density grid — visual representation */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800 dark:text-gray-200">{rows.length}</span> countries
            · <span className="font-semibold text-gray-800 dark:text-gray-200">{totalUsers.toLocaleString()}</span> total users
          </p>
          {/* Legend */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Low</span>
            {['#dbeafe', '#bfdbfe', '#93c5fd', '#3b82f6', '#2563eb', '#1e40af'].map((c) => (
              <span key={c} className="inline-block w-5 h-3 rounded-sm" style={{ background: c }} />
            ))}
            <span>High</span>
          </div>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {rows.map(([code, c]) => (
            <div
              key={code}
              className="relative rounded-lg p-2 cursor-pointer transition-transform hover:scale-105"
              style={{ background: densityColor(c.users) }}
              onMouseEnter={() => setTooltip(c)}
              onMouseLeave={() => setTooltip(null)}
            >
              <p className="text-xs font-bold text-white drop-shadow">{code}</p>
              <p className="text-xs text-white/80 drop-shadow">{(c.users / 1000).toFixed(1)}k</p>
            </div>
          ))}
        </div>

        {tooltip && (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3 text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-200">{tooltip.name}</p>
            <p className="text-gray-600 dark:text-gray-400">Region: {tooltip.region}</p>
            <p className="text-gray-600 dark:text-gray-400">
              Users: <span className="font-semibold">{tooltip.users.toLocaleString()}</span>
              {' '}({((tooltip.users / totalUsers) * 100).toFixed(1)}% of total)
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-4 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 pr-4">Rank</th>
              <th className="pb-2 pr-4">Country</th>
              <th className="pb-2 pr-4">Region</th>
              <th className="pb-2 pr-4 text-right">Users</th>
              <th className="pb-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([code, c], i) => (
              <tr key={code} className="border-b last:border-0">
                <td className="py-2 pr-4 text-gray-400">#{i + 1}</td>
                <td className="py-2 pr-4 font-medium">{c.name}</td>
                <td className="py-2 pr-4 text-gray-500">{c.region}</td>
                <td className="py-2 pr-4 text-right">{c.users.toLocaleString()}</td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(c.users / maxUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-gray-500 w-10 text-right">
                      {((c.users / totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
