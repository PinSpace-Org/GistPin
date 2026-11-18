import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RefreshControl } from './RefreshControl';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('RefreshControl', () => {
  it('renders an enabled Refresh button and no last-updated text initially', () => {
    render(<RefreshControl onRefresh={vi.fn()} />);

    const button = screen.getByRole('button', { name: /Refresh/ });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Last updated/)).toBeNull();
  });

  it('calls onRefresh and shows the last-updated time when clicked', () => {
    const onRefresh = vi.fn();
    render(<RefreshControl onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Last updated:/)).toBeDefined();
  });

  it('refreshes automatically on the default 30 second interval', () => {
    const onRefresh = vi.fn();
    render(<RefreshControl onRefresh={onRefresh} />);

    advance(29_999);
    expect(onRefresh).not.toHaveBeenCalled();

    advance(1);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    advance(30_000);
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('uses a custom autoRefreshInterval', () => {
    const onRefresh = vi.fn();
    render(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={5_000} />);

    advance(5_000);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows "Updating..." and disables the button during an auto refresh, then clears after a second', () => {
    render(<RefreshControl onRefresh={vi.fn()} autoRefreshInterval={5_000} />);

    advance(5_000);
    expect(screen.getByText('Updating...')).toBeDefined();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Last updated/)).toBeNull();

    advance(1_000);
    expect(screen.queryByText('Updating...')).toBeNull();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText(/Last updated:/)).toBeDefined();
  });

  it('does not auto refresh and disables the button when disabled', () => {
    const onRefresh = vi.fn();
    render(<RefreshControl onRefresh={onRefresh} disabled autoRefreshInterval={1_000} />);

    advance(10_000);

    expect(onRefresh).not.toHaveBeenCalled();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('stops the timer on unmount', () => {
    const onRefresh = vi.fn();
    const { unmount } = render(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={1_000} />);

    unmount();
    advance(10_000);

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('restarts the timer when the interval changes', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={10_000} />);

    advance(9_000);
    rerender(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={2_000} />);
    advance(2_000);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('stops auto refreshing once it becomes disabled', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={1_000} />);

    rerender(<RefreshControl onRefresh={onRefresh} autoRefreshInterval={1_000} disabled />);
    advance(5_000);

    expect(onRefresh).not.toHaveBeenCalled();
  });
});
