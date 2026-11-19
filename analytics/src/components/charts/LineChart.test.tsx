import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LineChart } from './LineChart';

afterEach(() => {
  cleanup();
});

const data = [
  { x: 1, a: 0, b: 40 },
  { x: 2, a: 20, b: 10 },
  { x: 3, a: 40, b: 30 },
];

/** The stroked series lines (the area fills under them have fill="url(#fade)"). */
const seriesPaths = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('path[fill="none"]'));

describe('LineChart', () => {
  it('draws one line per y key, with one segment per point', () => {
    const { container } = render(<LineChart data={data} xKey="x" yKeys={['a', 'b']} />);

    const paths = seriesPaths(container);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      const d = path.getAttribute('d') ?? '';
      expect(d.startsWith('M ')).toBe(true);
      expect(d.match(/L /g)).toHaveLength(data.length - 1);
      expect(d).not.toContain('NaN');
    }
  });

  it('lists every y key in the legend', () => {
    render(<LineChart data={data} xKey="x" yKeys={['a', 'b']} />);

    expect(screen.getByText('a')).toBeDefined();
    expect(screen.getByText('b')).toBeDefined();
  });

  it('labels the y axis from the min to the max value', () => {
    render(<LineChart data={data} xKey="x" yKeys={['a', 'b']} />);

    // y range is 0..40, so the five ticks are 40, 30, 20, 10, 0.
    for (const tick of ['40', '30', '20', '10', '0']) {
      expect(screen.getAllByText(tick).length).toBeGreaterThan(0);
    }
  });

  it('labels the x axis with the numeric x values', () => {
    render(<LineChart data={data} xKey="x" yKeys={['a']} />);

    for (const label of ['1', '2', '3']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('renders a tooltip per point and key, using the formatter when given', () => {
    const { container } = render(
      <LineChart
        data={data}
        xKey="x"
        yKeys={['a']}
        tooltipFormatter={(value, key) => `${key} is ${value}`}
      />,
    );

    const titles = Array.from(container.querySelectorAll('title')).map((t) => t.textContent);
    expect(titles).toEqual(['a is 0', 'a is 20', 'a is 40']);
  });

  it('falls back to "key: value" tooltips without a formatter', () => {
    const { container } = render(<LineChart data={data} xKey="x" yKeys={['a']} />);

    const titles = Array.from(container.querySelectorAll('title')).map((t) => t.textContent);
    expect(titles).toEqual(['a: 0', 'a: 20', 'a: 40']);
  });

  it('renders no tooltips when showTooltip is false', () => {
    const { container } = render(<LineChart data={data} xKey="x" yKeys={['a']} showTooltip={false} />);

    expect(container.querySelectorAll('title')).toHaveLength(0);
    expect(screen.queryByText('Hover a point for details')).toBeNull();
  });

  it('applies the colors prop to each series and cycles when there are more keys than colors', () => {
    const { container } = render(
      <LineChart data={data} xKey="x" yKeys={['a', 'b', 'c']} colors={['#111111', '#222222']} />,
    );

    const colors = seriesPaths(container).map((p) => p.parentElement?.getAttribute('color'));
    expect(colors).toEqual(['#111111', '#222222', '#111111']);
  });

  it('renders a single data point without NaN coordinates', () => {
    const { container } = render(
      <LineChart data={[{ x: 5, a: 7 }]} xKey="x" yKeys={['a']} />,
    );

    const path = seriesPaths(container)[0];
    expect(path).toBeDefined();
    expect(path?.getAttribute('d')).not.toContain('NaN');
    expect(container.querySelectorAll('circle[cx="NaN"], circle[cy="NaN"]')).toHaveLength(0);
  });

  it('accepts ISO date strings on the x axis', () => {
    const dated = [
      { when: '2026-01-01T00:00:00.000Z', a: 1 },
      { when: '2026-01-02T00:00:00.000Z', a: 3 },
    ];

    const { container } = render(<LineChart data={dated} xKey="when" yKeys={['a']} />);

    const d = seriesPaths(container)[0]?.getAttribute('d') ?? '';
    expect(d).not.toContain('NaN');
    expect(d.match(/L /g)).toHaveLength(1);
  });

  it('renders the empty state without series when there is no data and no y keys', () => {
    const { container } = render(<LineChart data={[]} xKey="x" yKeys={[]} />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(seriesPaths(container)).toHaveLength(0);
  });

  it('passes className and height through', () => {
    const { container } = render(
      <LineChart data={data} xKey="x" yKeys={['a']} className="my-chart" height={150} />,
    );

    expect((container.firstElementChild as HTMLElement).className).toContain('my-chart');
    expect(container.querySelector('svg')?.getAttribute('height')).toBe('150');
  });
});
