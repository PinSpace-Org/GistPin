import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { KPICard } from './KPICard';

afterEach(() => {
  cleanup();
});

describe('KPICard', () => {
  it('renders the title and a string value', () => {
    render(<KPICard title="Total gists" value="1,234" />);

    expect(screen.getByText('Total gists')).toBeDefined();
    expect(screen.getByText('1,234')).toBeDefined();
  });

  it('renders a numeric value, including zero', () => {
    render(<KPICard title="Reports" value={0} />);

    expect(screen.getByText('0')).toBeDefined();
  });

  it('renders the description only when given', () => {
    const { rerender } = render(<KPICard title="Active" value={5} />);
    expect(screen.queryByText('Not hidden or expired')).toBeNull();

    rerender(<KPICard title="Active" value={5} description="Not hidden or expired" />);
    expect(screen.getByText('Not hidden or expired')).toBeDefined();
  });

  it('appends a custom className', () => {
    const { container } = render(<KPICard title="Active" value={5} className="extra-class" />);

    expect((container.firstElementChild as HTMLElement).className).toContain('extra-class');
  });
});

describe('KPICard change indicator', () => {
  it('shows nothing when change is undefined', () => {
    render(<KPICard title="Active" value={5} />);

    expect(screen.queryByText(/%/)).toBeNull();
    expect(screen.queryByText('vs previous period')).toBeNull();
  });

  it('shows a positive change with a plus sign and one decimal, in green', () => {
    render(<KPICard title="Active" value={5} change={12.345} />);

    const change = screen.getByText('+12.3%');
    expect(change.className).toContain('text-green-600');
    expect(screen.getByText('vs previous period')).toBeDefined();
  });

  it('shows a negative change with its minus sign, in red', () => {
    render(<KPICard title="Active" value={5} change={-5} />);

    const change = screen.getByText('-5.0%');
    expect(change.className).toContain('text-red-600');
  });

  it('treats zero as non-negative: "+0.0%" in green', () => {
    render(<KPICard title="Active" value={5} change={0} />);

    const change = screen.getByText('+0.0%');
    expect(change.className).toContain('text-green-600');
  });

  it('uses a custom changeLabel instead of the default', () => {
    render(<KPICard title="Active" value={5} change={1} changeLabel="vs last week" />);

    expect(screen.getByText('vs last week')).toBeDefined();
    expect(screen.queryByText('vs previous period')).toBeNull();
  });
});

describe('KPICard sparkline', () => {
  const polyline = (container: HTMLElement) => container.querySelector('polyline');

  it('renders no sparkline when none is given or it is empty', () => {
    const none = render(<KPICard title="A" value={1} />);
    expect(none.container.querySelector('svg')).toBeNull();
    none.unmount();

    const empty = render(<KPICard title="A" value={1} sparkline={[]} />);
    expect(empty.container.querySelector('svg')).toBeNull();
  });

  it('draws a polyline with one point per value, hidden from assistive tech', () => {
    const { container } = render(<KPICard title="A" value={1} change={1} sparkline={[1, 5, 3, 8]} />);

    const line = polyline(container);
    expect(line?.getAttribute('points')?.split(' ')).toHaveLength(4);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('plots higher values higher on the chart across the full width', () => {
    const { container } = render(<KPICard title="A" value={1} change={1} sparkline={[0, 10]} />);

    expect(polyline(container)?.getAttribute('points')).toBe('2,46 126,2');
  });

  it('colors the line green for a positive change and red for a negative one', () => {
    const up = render(<KPICard title="A" value={1} change={2} sparkline={[1, 2]} />);
    expect(polyline(up.container)?.getAttribute('stroke')).toBe('#22c55e');
    up.unmount();

    const down = render(<KPICard title="A" value={1} change={-2} sparkline={[2, 1]} />);
    expect(polyline(down.container)?.getAttribute('stroke')).toBe('#ef4444');
  });

  it('does not produce NaN for a single value or a flat series', () => {
    const single = render(<KPICard title="A" value={1} change={1} sparkline={[5]} />);
    expect(polyline(single.container)?.getAttribute('points')).not.toContain('NaN');
    single.unmount();

    const flat = render(<KPICard title="A" value={1} change={1} sparkline={[3, 3, 3]} />);
    expect(polyline(flat.container)?.getAttribute('points')).not.toContain('NaN');
  });
});
