import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CopyButton } from './CopyButton';

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setClipboard(undefined);
});

/** Clicks and lets the async handler's awaited clipboard promise settle. */
async function click(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

describe('CopyButton', () => {
  it('shows the default label and an accessible name', () => {
    render(<CopyButton value="abc" />);

    expect(screen.getByRole('button', { name: 'Copy Copy' })).toBeDefined();
    expect(screen.getByText('Copy')).toBeDefined();
  });

  it('uses a custom label', () => {
    render(<CopyButton value="abc" label="Gist ID" />);

    expect(screen.getByRole('button', { name: 'Copy Gist ID' })).toBeDefined();
    expect(screen.getByText('Gist ID')).toBeDefined();
  });

  it('writes the value to the clipboard and switches to the copied state', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    render(<CopyButton value="gist-123" />);

    await click(screen.getByRole('button'));

    expect(writeText).toHaveBeenCalledWith('gist-123');
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeDefined();
    expect(screen.getByText('Copied')).toBeDefined();
  });

  it('calls onCopy after a successful copy', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);

    await click(screen.getByRole('button'));

    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('returns to the idle state after two seconds', async () => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) });
    render(<CopyButton value="abc" label="ID" />);
    await click(screen.getByRole('button'));
    expect(screen.getByText('Copied')).toBeDefined();

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole('button', { name: 'Copy ID' })).toBeDefined();
  });

  it('does not throw and does not report success when the Clipboard API is unavailable', async () => {
    setClipboard(undefined);
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);

    await click(screen.getByRole('button'));

    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.queryByText('Copied')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy Copy' })).toBeDefined();
  });

  it('does not report success when the clipboard write is rejected', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    const onCopy = vi.fn();
    render(<CopyButton value="abc" onCopy={onCopy} />);

    await click(screen.getByRole('button'));

    expect(onCopy).not.toHaveBeenCalled();
    expect(screen.queryByText('Copied')).toBeNull();
  });

  it('appends a custom className', () => {
    render(<CopyButton value="abc" className="extra-class" />);

    expect(screen.getByRole('button').className).toContain('extra-class');
  });
});
