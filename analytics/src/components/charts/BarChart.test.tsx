import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BarChart } from './BarChart';

afterEach(() => {
  cleanup();
});

const data = [
  { label: 'Mon', a: 10, b: 30 },
  { label: 'Tue', a: 20, b: 5 },
  { label: 'Wed', a: 0, b: 15 },
];

/** Bars only: their wrapper groups have no class, unlike the grid and legend. */
const bars = (container: HTMLElement) => Array.from(container.querySelectorAll('svg > g:not([class]) rect'));
const heightOf = (el: Element) => Number(el.getAttribute('height'));

describe('BarChart', () => {
  it('renders one bar per value key per data point when grouped', () => {
    const { container } = render(<BarChart data={data} labelKey="label" valueKeys={['a', 'b']} />);

    expect(bars(container)).toHaveLength(data.length * 2);
  });

  it('renders one bar per value key per data point when stacked', () => {
    const { container } = render(
      <BarChart data={data} labelKey="label" valueKeys={['a', 'b']} stacked />,
    );

    expect(bars(container)).toHaveLength(data.length * 2);
  });

  it('scales grouped bars against the largest single value', () => {
    const { container } = render(
      <BarChart data={[{ label: 'x', a: 10, b: 30 }]} labelKey="label" valueKeys={['a', 'b']} height={300} />,
    );

    // innerHeight = 300 - 20 - 60 = 220; max single value = 30.
    const [a, b] = bars(container);
    expect(heightOf(b!)).toBeCloseTo(220, 5);
    expect(heightOf(a!)).toBeCloseTo((10 / 30) * 220, 5);
  });

  it('scales stacked bars against the largest stack total and stacks them', () => {
    const { container } = render(
      <BarChart
        data={[{ label: 'x', a: 10, b: 30 }]}
        labelKey="label"
        valueKeys={['a', 'b']}
        height={300}
        stacked
      />,
    );

    // max stack = 40, so a is a quarter and b three quarters of 220.
    const [a, b] = bars(container);
    expect(heightOf(a!)).toBeCloseTo(55, 5);
    expect(heightOf(b!)).toBeCloseTo(165, 5);
    // b sits directly on top of a.
    expect(Number(b!.getAttribute('y')) + heightOf(b!)).toBeCloseTo(Number(a!.getAttribute('y')), 5);
  });

  it('labels the y axis up to the maximum value', () => {
    render(<BarChart data={data} labelKey="label" valueKeys={['a', 'b']} />);

    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('shows each data point label and every value key in the legend', () => {
    render(<BarChart data={data} labelKey="label" valueKeys={['a', 'b']} />);

    for (const text of ['Mon', 'Tue', 'Wed', 'a', 'b']) {
      expect(screen.getByText(text)).toBeDefined();
    }
  });

  it('truncates labels longer than 15 characters', () => {
    render(
      <BarChart
        data={[{ label: 'a-very-long-label-indeed', a: 1 }]}
        labelKey="label"
        valueKeys={['a']}
      />,
    );

    expect(screen.getByText('a-very-long-...')).toBeDefined();
    expect(screen.queryByText('a-very-long-label-indeed')).toBeNull();
  });

  it('limits the number of bars to maxBars', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ label: `L${i}`, a: i + 1 }));

    const { container } = render(<BarChart data={many} labelKey="label" valueKeys={['a']} maxBars={4} />);

    expect(bars(container)).toHaveLength(4);
    expect(screen.queryByText('L4')).toBeNull();
  });

  it('shows "key: value" tooltips, or the formatter output when given', () => {
    const single = [{ label: 'x', a: 12 }];
    const plain = render(<BarChart data={single} labelKey="label" valueKeys={['a']} />);
    expect(Array.from(plain.container.querySelectorAll('title')).map((t) => t.textContent)).toEqual(['a: 12']);
    plain.unmount();

    const formatted = render(
      <BarChart
        data={single}
        labelKey="label"
        valueKeys={['a']}
        tooltipFormatter={(value, key) => `${value} ${key}`}
      />,
    );
    expect(
      Array.from(formatted.container.querySelectorAll('title')).map((t) => t.textContent),
    ).toEqual(['12 a']);
  });

  it('renders no tooltips when showTooltip is false', () => {
    const { container } = render(
      <BarChart data={data} labelKey="label" valueKeys={['a']} showTooltip={false} />,
    );

    expect(container.querySelectorAll('title')).toHaveLength(0);
  });

  it('applies the colors prop to the bars by value key', () => {
    const { container } = render(
      <BarChart
        data={[{ label: 'x', a: 1, b: 2 }]}
        labelKey="label"
        valueKeys={['a', 'b']}
        colors={['#111111', '#222222']}
      />,
    );

    expect(bars(container).map((r) => r.getAttribute('fill'))).toEqual(['#111111', '#222222']);
  });

  it('treats a missing value as zero', () => {
    const { container } = render(
      <BarChart data={[{ label: 'x', a: 5 }]} labelKey="label" valueKeys={['a', 'b']} />,
    );

    const [, b] = bars(container);
    expect(heightOf(b!)).toBe(0);
  });

  it('renders no bars for empty data but still draws the legend', () => {
    const { container } = render(<BarChart data={[]} labelKey="label" valueKeys={['a']} />);

    expect(bars(container)).toHaveLength(0);
    expect(screen.getByText('a')).toBeDefined();
  });
});
