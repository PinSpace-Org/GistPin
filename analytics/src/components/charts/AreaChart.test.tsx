import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AreaChart } from './AreaChart';

afterEach(() => {
  cleanup();
});

const data = [
  { x: 1, a: 10, b: 20 },
  { x: 2, a: 20, b: 20 },
  { x: 3, a: 30, b: 20 },
];

/** The stroked series outlines (the filled areas use a gradient fill). */
const outlines = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('path[fill="none"]'));
const areas = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('path[fill^="url(#area-gradient-"]'));

describe('AreaChart', () => {
  it('draws an outline and a filled area per y key', () => {
    const { container } = render(<AreaChart data={data} xKey="x" yKeys={['a', 'b']} />);

    expect(outlines(container)).toHaveLength(2);
    expect(areas(container).map((p) => p.getAttribute('fill'))).toEqual([
      'url(#area-gradient-a)',
      'url(#area-gradient-b)',
    ]);
  });

  it('defines one gradient per y key', () => {
    const { container } = render(<AreaChart data={data} xKey="x" yKeys={['a', 'b']} />);

    expect(container.querySelector('#area-gradient-a')).not.toBeNull();
    expect(container.querySelector('#area-gradient-b')).not.toBeNull();
  });

  it('stacks the series: the second outline sits at the cumulative total', () => {
    const { container } = render(
      <AreaChart data={[{ x: 1, a: 10, b: 30 }, { x: 2, a: 10, b: 30 }]} xKey="x" yKeys={['a', 'b']} height={300} />,
    );

    const y = (path: Element) => Number((path.getAttribute('d') ?? '').split(' ')[2]);
    const [a, b] = outlines(container);

    // innerHeight = 300 - 20 - 40 = 240; max total = 40.
    // a is at 10/40 of the height, b (cumulative 40) is at the very top.
    expect(y(b!)).toBeCloseTo(20, 5);
    expect(y(a!)).toBeCloseTo(20 + 240 - (10 / 40) * 240, 5);
  });

  it('labels the y axis up to the largest stacked total', () => {
    render(<AreaChart data={data} xKey="x" yKeys={['a', 'b']} />);

    // totals are 30, 40 and 50, so the top tick is 50.
    expect(screen.getAllByText('50').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('lists every y key in the legend', () => {
    render(<AreaChart data={data} xKey="x" yKeys={['a', 'b']} />);

    expect(screen.getByText('a')).toBeDefined();
    expect(screen.getByText('b')).toBeDefined();
  });

  it('shows the per-series value in tooltips, not the cumulative one', () => {
    const { container } = render(<AreaChart data={[{ x: 1, a: 10, b: 30 }]} xKey="x" yKeys={['a', 'b']} />);

    const titles = Array.from(container.querySelectorAll('title')).map((t) => t.textContent);
    expect(titles).toEqual(['a: 10', 'b: 30']);
  });

  it('uses the tooltip formatter when provided', () => {
    const { container } = render(
      <AreaChart
        data={[{ x: 1, a: 10 }]}
        xKey="x"
        yKeys={['a']}
        tooltipFormatter={(value, key) => `${key}=${value}!`}
      />,
    );

    expect(container.querySelector('title')?.textContent).toBe('a=10!');
  });

  it('renders no tooltips when showTooltip is false', () => {
    const { container } = render(<AreaChart data={data} xKey="x" yKeys={['a']} showTooltip={false} />);

    expect(container.querySelectorAll('title')).toHaveLength(0);
  });

  it('applies the colors prop to the outlines', () => {
    const { container } = render(
      <AreaChart data={data} xKey="x" yKeys={['a', 'b']} colors={['#111111', '#222222']} />,
    );

    expect(outlines(container).map((p) => p.getAttribute('stroke'))).toEqual(['#111111', '#222222']);
  });

  it('treats a missing value as zero', () => {
    const { container } = render(<AreaChart data={[{ x: 1, a: 5 }, { x: 2, a: 5 }]} xKey="x" yKeys={['a', 'b']} />);

    for (const path of outlines(container)) {
      expect(path.getAttribute('d')).not.toContain('NaN');
    }
  });

  it('renders a single data point without NaN coordinates', () => {
    const { container } = render(<AreaChart data={[{ x: 5, a: 7 }]} xKey="x" yKeys={['a']} />);

    expect(outlines(container)[0]?.getAttribute('d')).not.toContain('NaN');
  });

  it('accepts ISO date strings on the x axis', () => {
    const dated = [
      { when: '2026-01-01T00:00:00.000Z', a: 1 },
      { when: '2026-01-02T00:00:00.000Z', a: 3 },
    ];

    const { container } = render(<AreaChart data={dated} xKey="when" yKeys={['a']} />);

    expect(outlines(container)[0]?.getAttribute('d')).not.toContain('NaN');
  });

  it('renders no series for empty data', () => {
    const { container } = render(<AreaChart data={[]} xKey="x" yKeys={['a']} />);

    expect(container.querySelector('svg')).not.toBeNull();
    for (const path of [...outlines(container), ...areas(container)]) {
      expect(path.getAttribute('d')).not.toContain('NaN');
    }
    expect(container.querySelectorAll('title')).toHaveLength(0);
  });
});
