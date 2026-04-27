# GistPin Analytics — Developer Guide

## Stack

- **Next.js 14** (App Router, `'use client'` where needed)
- **Tailwind CSS** for styling
- **Recharts** for all chart components
- **TypeScript** throughout

## Project Structure

```
analytics/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Overview dashboard
│   └── */page.tsx    # Feature pages (users, geo, export, …)
├── components/
│   ├── ui/           # Reusable primitives (badges, skeletons, …)
│   ├── charts/       # Chart wrappers (Recharts)
│   ├── Annotation.tsx    # Annotation panel component
│   ├── QualityBadge.tsx  # Re-export of DataQualityBadge
│   ├── Sidebar.tsx       # Mobile-first collapsible sidebar
│   └── Layout.tsx        # App shell with header + sidebar
├── hooks/
│   ├── useAnnotations.ts # CRUD hook for chart annotations
│   └── useDateRange.ts   # Date range state
├── lib/
│   ├── annotations.ts    # localStorage annotation helpers
│   ├── data-quality.ts   # Quality scoring (gaps, flat runs)
│   ├── analytics-data.ts # Mock / seed data generators
│   └── …
└── docs/             # This directory
```

## Adding a New Chart

1. Create `analytics/components/charts/MyChart.tsx` using Recharts.
2. Lazy-load it in the relevant page with `next/dynamic`.
3. Wrap with `<SwipeableChart>` for mobile touch support.
4. Optionally wrap with `<AnnotatedChart chartId="my-chart" labels={labels}>`.

## Annotations

Annotations are stored in `localStorage` under the key `gistpin-annotations`.

```ts
import { useAnnotations } from '@/hooks/useAnnotations';

const { annotations, add, edit, remove } = useAnnotations('my-chart-id');
```

## Data Quality

```ts
import { analyseDataQuality } from '@/lib/data-quality';

const report = analyseDataQuality(labels, values);
// report.score  → 0–100
// report.level  → 'good' | 'warning' | 'poor'
// report.gaps   → DataGap[]
```

## Mobile / Responsive

- The `Layout` component handles the mobile drawer via `drawerOpen` state.
- `Sidebar.tsx` provides a standalone swipe-to-close drawer primitive.
- Charts are wrapped in `SwipeableChart` (defined in `app/page.tsx`) for horizontal scroll on small screens.
- Tailwind breakpoints used: `sm:` (640 px), `md:` (768 px), `lg:` (1024 px).

## Environment Variables

Copy `analytics/.env.example` and fill in values before running locally.

## Running Locally

```bash
cd analytics
npm install
npm run dev
```
