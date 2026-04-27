# GistPin Analytics — User Guide

## Overview

The Analytics dashboard gives you real-time and historical insight into GistPin activity: gist volume, user behaviour, geographic spread, and content quality.

## Navigation

Use the sidebar to switch between views:

| Section | What it shows |
|---|---|
| Overview | KPIs, live counter, user activity charts |
| Users | New vs returning user trends |
| Geographic | Location heatmap and top regions |
| Segments | Audience breakdown |
| Word Cloud | Most-used terms in gists |
| Export | Download data as CSV / Excel / PDF |
| Errors | Error rate and stack traces |
| Collaboration | Shared dashboards |

On mobile, tap the ☰ menu icon to open the sidebar. Swipe left to close it.

## Date Range

Select **7D / 30D / 90D / 1Y** in the top bar to filter all charts to that window.

## Chart Annotations

Click anywhere on a chart to add a timestamped note. Annotations are stored locally in your browser.

- **Add** — pick a date label and type a note, then click *Add*.
- **Edit** — click *edit* next to any annotation.
- **Delete** — click ✕ to remove.

## Data Quality Badges

Each chart header may show a coloured badge (🟢 / 🟡 / 🔴) indicating data completeness. Click the badge for a breakdown of gaps and suspicious flat runs.

## Dark Mode

Toggle dark/light mode with the moon/sun icon in the top-right corner. Your preference is saved across sessions.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Open search |
| `D` | Toggle dark mode |
| `E` | Go to Export page |

## Troubleshooting

**Charts not loading** — Refresh the page. Charts load progressively; complex visualisations appear ~400 ms after the KPI row.

**Annotations disappeared** — Annotations are stored in `localStorage`. Clearing browser data will remove them.

**Data looks stale** — The refresh bar at the top shows the last fetch time. Click it to force a reload.
