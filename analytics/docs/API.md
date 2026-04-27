# GistPin Analytics — API Reference

## Hooks

### `useAnnotations(chartId: string)`

Manages annotations for a specific chart, persisted in `localStorage`.

```ts
import { useAnnotations } from '@/hooks/useAnnotations';
```

| Return | Type | Description |
|---|---|---|
| `annotations` | `Annotation[]` | All annotations for this chart |
| `add(date, text)` | `(string, string) => Annotation` | Create a new annotation |
| `edit(id, patch)` | `(string, Partial<{text,date}>) => void` | Update an annotation |
| `remove(id)` | `(string) => void` | Delete an annotation |

### `useDateRange()`

```ts
import { useDateRange } from '@/hooks/useDateRange';
```

Returns `{ range, setRange }` where `range` is `'7D' | '30D' | '90D' | '1Y'`.

---

## Library Functions

### `analyseDataQuality(labels, values, totalHours?)`

```ts
import { analyseDataQuality } from '@/lib/data-quality';
```

| Param | Type | Default |
|---|---|---|
| `labels` | `string[]` | — |
| `values` | `number[]` | — |
| `totalHours` | `number` | `labels.length * 24` |

Returns `QualityReport`:

```ts
interface QualityReport {
  score: number;        // 0–100
  level: QualityLevel; // 'good' | 'warning' | 'poor'
  gaps: DataGap[];
  flatRuns: number[];
  summary: string;
}
```

### `qualityColor(level)` / `qualityIcon(level)`

```ts
import { qualityColor, qualityIcon } from '@/lib/data-quality';

qualityColor('good')    // '#22c55e'
qualityIcon('warning')  // '🟡'
```

### Annotation helpers (`@/lib/annotations`)

| Function | Signature | Description |
|---|---|---|
| `getAnnotations` | `(chartId?: string) => Annotation[]` | Read from localStorage |
| `saveAnnotation` | `(data: Omit<Annotation,'id'>) => Annotation` | Persist new annotation |
| `updateAnnotation` | `(id, patch) => void` | Patch existing annotation |
| `deleteAnnotation` | `(id) => void` | Remove annotation |

---

## Components

### `<AnnotationPanel chartId labels />`

```tsx
import AnnotationPanel from '@/components/Annotation';

<AnnotationPanel chartId="daily-gists" labels={['1 Jan', '2 Jan', …]} />
```

### `<QualityBadge labels values metricName? />`

```tsx
import { QualityBadge } from '@/components/QualityBadge';

<QualityBadge labels={labels} values={values} metricName="Daily Gists" />
```

### `<Sidebar open onClose>`

```tsx
import Sidebar from '@/components/Sidebar';

<Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)}>
  {/* nav content */}
</Sidebar>
```

Supports swipe-left-to-close on touch devices.

### `<AnnotatedChart chartId labels>`

```tsx
import AnnotatedChart from '@/components/ui/AnnotatedChart';

<AnnotatedChart chartId="user-area" labels={labels}>
  <MyChart />
</AnnotatedChart>
```

Renders the chart with click-to-annotate overlay and an annotation list below.
