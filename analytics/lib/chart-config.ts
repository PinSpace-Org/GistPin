import type { ChartOptions } from 'chart.js';

export const COLORS = {
  primary: 'rgba(99,102,241,0.9)',
  primaryFill: 'rgba(99,102,241,0.35)',
  grid: 'rgba(0,0,0,0.05)',
  tick: '#9ca3af',
  tooltipBg: 'rgba(17,24,39,0.9)',
  tooltipTitle: '#f9fafb',
  tooltipBody: '#d1d5db',
};

export const defaultTooltip = {
  backgroundColor: COLORS.tooltipBg,
  titleColor: COLORS.tooltipTitle,
  bodyColor: COLORS.tooltipBody,
  padding: 12,
  cornerRadius: 8,
  displayColors: false,
};

export const defaultScales = {
  x: {
    grid: { display: false },
    ticks: { color: COLORS.tick, font: { size: 11 } },
    border: { color: '#e5e7eb' },
  },
  y: {
    beginAtZero: false,
    grid: { color: COLORS.grid },
    ticks: { color: COLORS.tick, font: { size: 11 } },
    border: { display: false },
  },
};

export function baseOptions(overrides: ChartOptions<'line'> = {}): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: defaultTooltip },
    scales: defaultScales,
    ...overrides,
  };
}
