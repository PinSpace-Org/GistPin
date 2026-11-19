import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DonutChart } from './DonutChart';

afterEach(() => {
  cleanup();
});

const segments = [
  { label: 'Active', value: 75 },
  { label: 'Hidden', value: 25 },
];

const paths = (container: HTMLElement) => Array.from(container.querySelectorAll('svg path'));

describe('DonutChart', () => {
  it('draws one arc per segment', () => {
    const { container } = render(<DonutChart segments={segments} />);

    expect(paths(container)).toHaveLength(2);
  });

  it('shows each segment share as a percentage in the legend and on the arc', () => {
    render(<DonutChart segments={segments} />);

    // Once in the legend and once as an arc label.
    expect(screen.getAllByText('75.0%')).toHaveLength(2);
    expect(screen.getAllByText('25.0%')).toHaveLength(2);
  });

  it('lists the segment labels in the legend', () => {
    render(<DonutChart segments={segments} />);

    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Hidden')).toBeDefined();
  });

  it('hides the legend when showLegend is false', () => {
    render(<DonutChart segments={segments} showLegend={false} />);

    expect(screen.queryByText('Active')).toBeNull();
    // Arc labels remain.
    expect(screen.getAllByText('75.0%')).toHaveLength(1);
  });

  it('hides the arc labels when showLabels is false', () => {
    render(<DonutChart segments={segments} showLabels={false} />);

    // Only the legend percentage remains.
    expect(screen.getAllByText('75.0%')).toHaveLength(1);
  });

  it('omits arc labels for slices of 10 degrees or less', () => {
    render(
      <DonutChart
        segments={[
          { label: 'Big', value: 98 },
          { label: 'Tiny', value: 2 },
        ]}
      />,
    );

    // 98% label shows on the arc and legend; the 2% slice (7.2 degrees) only in the legend.
    expect(screen.getAllByText('98.0%')).toHaveLength(2);
    expect(screen.getAllByText('2.0%')).toHaveLength(1);
  });

  it('uses the large-arc flag only for slices over 180 degrees', () => {
    const { container } = render(<DonutChart segments={segments} />);

    const [big, small] = paths(container);
    expect(big?.getAttribute('d')).toContain('A 80 80 0 1 1');
    expect(small?.getAttribute('d')).toContain('A 80 80 0 0 1');
  });

  it('does not produce NaN when every value is zero', () => {
    const { container } = render(
      <DonutChart
        segments={[
          { label: 'A', value: 0 },
          { label: 'B', value: 0 },
        ]}
      />,
    );

    for (const path of paths(container)) {
      expect(path.getAttribute('d')).not.toContain('NaN');
    }
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.getAllByText('0.0%')).toHaveLength(2);
  });

  it('renders no arcs for an empty segment list', () => {
    const { container } = render(<DonutChart segments={[]} />);

    expect(paths(container)).toHaveLength(0);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('uses a segment color when given and the default palette otherwise', () => {
    const { container } = render(
      <DonutChart
        segments={[
          { label: 'Custom', value: 1, color: '#123456' },
          { label: 'Default', value: 1 },
        ]}
      />,
    );

    const fills = paths(container).map((p) => p.getAttribute('fill'));
    expect(fills).toEqual(['#123456', '#ef4444']);
  });

  it('renders the center value and label when provided', () => {
    render(<DonutChart segments={segments} centerValue="100" centerLabel="Total" />);

    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
  });

  it('renders no center text when none is provided', () => {
    render(<DonutChart segments={segments} />);

    expect(screen.queryByText('Total')).toBeNull();
  });
});
