# GistPin Analytics — Design System

## Overview

This document describes the visual language, component patterns, and utility tokens used across the GistPin Analytics application.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#1d4ed8` | CTAs, links, active states |
| Success | `#15803d` | Positive deltas, confirmations |
| Danger | `#b91c1c` | Errors, negative deltas |
| Warning | `#b45309` | Caution states, pending |
| Info | `#0369a1` | Informational highlights |
| Slate 50 | `#f8fafc` | Page backgrounds |
| Slate 100 | `#f1f5f9` | Secondary backgrounds |
| Slate 800 | `#1e293b` | Dark surfaces |
| Slate 900 | `#0f172a` | Code blocks, dark headers |

---

## Typography

| Class | Size | Weight | Use case |
|-------|------|--------|----------|
| `text-4xl` | 36px | 700 | Page titles |
| `text-2xl` | 24px | 700 | Section headings |
| `text-xl` | 20px | 600 | Card headings |
| `text-base` | 16px | 400 | Body copy |
| `text-sm` | 14px | 400 | Labels, captions |
| `text-xs` | 12px | 400 | Badges, metadata |

Font family: system-ui / sans-serif. Monospace: `monospace` for code and timestamps.

---

## Components

### Button

```tsx
// Primary
<button style={{
  background: '#1d4ed8', color: '#fff',
  border: 'none', borderRadius: 999,
  padding: '10px 20px', fontWeight: 700,
  cursor: 'pointer',
}}>Label</button>

// Outline
<button style={{
  background: 'transparent', color: '#1d4ed8',
  border: '2px solid #1d4ed8', borderRadius: 999,
  padding: '8px 20px', fontWeight: 700,
  cursor: 'pointer',
}}>Label</button>
```

**Props / variants:** `Primary` | `Secondary` | `Danger` | `Success` | `Outline`

---

### Card

```tsx
<div style={{
  background: '#fff',
  borderRadius: 20,
  padding: 20,
  border: '1px solid rgba(148,163,184,0.18)',
  boxShadow: '0 4px 12px rgba(15,23,42,0.07)',
}}>
  {children}
</div>
```

Use `borderRadius: 28` and a gradient background for hero/header cards.

---

### Badge

```tsx
<span style={{
  background: '#dcfce7', color: '#15803d',
  borderRadius: 999, padding: '4px 12px',
  fontSize: 12, fontWeight: 700,
  letterSpacing: '0.06em', textTransform: 'uppercase',
}}>Live</span>
```

**Variants:** `Live` (green) | `Beta` (blue) | `Deprecated` (red) | `New` (amber)

---

### Section header badge

```tsx
<div style={{
  display: 'inline-flex', alignItems: 'center',
  borderRadius: 999, padding: '6px 12px',
  background: '#1d4ed8', color: '#fff',
  fontSize: 12, fontWeight: 700,
  letterSpacing: '0.08em', textTransform: 'uppercase',
}}>Section Label</div>
```

---

### Table

```tsx
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <thead>
    <tr>
      <th style={{ textAlign: 'left', padding: '12px 10px' }}>Column</th>
    </tr>
  </thead>
  <tbody>
    <tr style={{ borderTop: '1px solid #e2e8f0' }}>
      <td style={{ padding: '14px 10px' }}>Value</td>
    </tr>
  </tbody>
</table>
```

Wrap in `<div style={{ overflowX: 'auto' }}>` for responsive tables.

---

## Utility Classes

See [`../styles/utilities.css`](../styles/utilities.css) for the full library.

### Spacing

```css
.m-{n}   /* margin: n*4px */
.p-{n}   /* padding: n*4px */
.mt-{n}  /* margin-top */
.mb-{n}  /* margin-bottom */
.px-{n}  /* horizontal padding */
.py-{n}  /* vertical padding */
```

Scale: `0 | 1(4px) | 2(8px) | 3(12px) | 4(16px) | 6(24px) | 8(32px)`

### Flexbox

```css
.flex           /* display: flex */
.flex-col       /* flex-direction: column */
.items-center   /* align-items: center */
.justify-between/* justify-content: space-between */
.gap-{n}        /* gap */
.flex-wrap      /* flex-wrap: wrap */
```

### Typography

```css
.text-{size}    /* font-size */
.font-bold      /* font-weight: 700 */
.text-center    /* text-align: center */
.truncate       /* overflow ellipsis */
.uppercase      /* text-transform: uppercase */
```

---

## Layout Patterns

### Page wrapper

```tsx
<main style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 24px 64px' }}>
```

### Hero section

```tsx
<section style={{
  background: 'linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)',
  borderRadius: 28, padding: '30px 30px 26px',
  boxShadow: '0 18px 46px rgba(15,23,42,0.08)',
  marginBottom: 28,
}}>
```

### Responsive grid

```tsx
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 20,
}}>
```

---

## Chart Conventions

- Register only the Chart.js components you use.
- Always set `responsive: true`.
- Grid lines: `rgba(0,0,0,0.05)` on y-axis, hidden on x-axis.
- Tick color: `#9ca3af`, font size 11.
- Tooltip background: `rgba(17,24,39,0.9)`, corner radius 8.
- Legend: hidden by default unless multiple datasets.

---

## Accessibility

- All interactive elements must have `cursor: pointer`.
- Color is never the sole indicator of state — pair with text or icon.
- Maintain a minimum contrast ratio of 4.5:1 for body text.
- Wrap overflow tables in a scrollable container with `-webkit-overflow-scrolling: touch`.
