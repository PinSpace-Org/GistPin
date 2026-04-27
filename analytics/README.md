# GistPin Analytics Dashboard

A data visualization dashboard for the GistPin platform, providing insights into gist activity, user engagement, and geographic distribution.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Architecture](#architecture)
- [Charts & Components](#charts--components)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
cd analytics
npm install
```

### Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## Environment Variables

Create a `.env.local` file in the `analytics/` directory:

```env
# GistPin Backend API base URL
NEXT_PUBLIC_API_URL=http://localhost:3000

# Optional: override mock data record count
NEXT_PUBLIC_MOCK_DATA_COUNT=500
```

No environment variables are required for local development — all data is generated client-side via mock utilities.

---

## Available Scripts

Run from inside the `analytics/` directory:

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type check |

---

## Architecture

**Tech stack:** Next.js 15 (App Router) · Chart.js + react-chartjs-2 · TanStack Query · TypeScript

```
analytics/
├── app/
│   ├── page.tsx                  # Main dashboard
│   ├── forecast/                 # Forecast page
│   ├── funnel/                   # User funnel page
│   ├── segments/                 # Audience segments
│   ├── campaigns/                # Campaign analytics
│   ├── moderation/               # Content moderation
│   ├── comparison/               # Period comparison
│   ├── projections/              # Growth projections
│   ├── reports/                  # Report builder
│   ├── experiments/              # A/B experiments
│   ├── query-builder/            # Custom query builder
│   └── ...                       # Other feature pages
├── components/
│   ├── charts/                   # Chart components
│   ├── ui/                       # Shared UI components
│   ├── DateRangePicker.tsx        # Date range selector with presets
│   └── KPICard.tsx               # KPI metric cards
├── hooks/
│   └── useDateRange.ts           # Date range state + URL persistence
├── lib/
│   ├── analytics-data.ts         # Mock data generators
│   ├── analytics-queries.ts      # TanStack Query hooks
│   ├── anomaly.ts                # Anomaly detection
│   ├── export.ts                 # CSV export utilities
│   └── utils.ts                  # Shared utilities
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

### Data flow

All chart data is generated client-side via mock utilities in `lib/analytics-data.ts`. TanStack Query wraps each data source with a simulated async delay. No network requests are made in the current implementation.

---

## Charts & Components

### Main Dashboard (`app/page.tsx`)

| Component | Description |
|---|---|
| `KPICard` | Key metric cards (total gists, active users, etc.) |
| `LiveGistCounter` | Real-time gist counter simulation |
| `UserAreaChart` | New vs returning users over 90 days |
| `DailyGistsChart` | Daily gist volume — last 30 days |
| `ScatterChart` | Gist age vs. engagement with regression trendline |
| `RadarChart` | Platform usage comparison (this month vs. last) |
| `CategoryPieChart` | Gist category distribution (8 segments, interactive legend) |
| `EngagementDonutChart` | Engagement breakdown: Views, Likes, Shares, Comments |
| `LocationTable` | City-level activity trends with sparklines |

### `DateRangePicker`

Preset buttons: **Today**, **Last 7 days**, **Last 30 days**, **Custom**.  
Custom mode shows two `<input type="date">` fields. Selected range is persisted in URL params (`?preset=7d&from=...&to=...`).

### `useDateRange` hook

```ts
const { range, preset, applyPreset } = useDateRange();
// range: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
// preset: 'today' | '7d' | '30d' | 'custom'
// applyPreset(preset, customRange?)
```

State is synced to/from URL search params so ranges survive page refresh and are shareable.

---

## API Documentation

The dashboard is designed to consume the GistPin REST API. The backend exposes:

### `GET /gists`

Returns gists near a coordinate.

| Parameter | Required | Default | Description |
|---|---|---|---|
| `lat` | yes | — | Latitude (decimal degrees) |
| `lon` | yes | — | Longitude (decimal degrees) |
| `radius` | no | 500 | Search radius in meters |
| `limit` | no | 20 | Max records per page |
| `cursor` | no | — | Pagination cursor (base64) |

**Example response:**

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Suya spot open till midnight",
      "location_cell": "s17eb4n",
      "content_hash": "Qm...",
      "created_at": "2026-03-28T10:00:00Z",
      "distance": 42.5
    }
  ],
  "cursor": "eyJpZCI6..."
}
```

### `GET /gists/:id`

Returns a single gist by UUID.

### `GET /health`

Returns backend and database status.

### Swagger UI

Full interactive API docs at `http://localhost:3000/api/docs` when the backend is running.

---

## Troubleshooting

**Chart does not render / blank page**  
Each chart file calls `ChartJS.register(...)` at module level. If you add a new chart type, register its elements/scales there. All chart files must use the `'use client'` directive.

**`@/` import paths not resolving**  
The `@/` alias maps to the `analytics/` root. Verify `tsconfig.json` contains:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] } } }
```

**`Module not found: react-chartjs-2`**  
Run `npm install` inside the `analytics/` directory. Dependencies are not hoisted from the repo root.

**Backend not connecting**  
1. Start the backend: `cd ../Backend && npm run start:dev`
2. Set `NEXT_PUBLIC_API_URL` in `.env.local` to match the backend port
3. CORS is enabled for all origins in development
