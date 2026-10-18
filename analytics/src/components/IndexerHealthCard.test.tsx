import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { IndexerHealthCard } from './IndexerHealthCard';
import type { IndexerStatsResponse } from '@/lib/api/types';

describe('IndexerHealthCard', () => {
  it('renders loading state', () => {
    render(<IndexerHealthCard isLoading={true} />);
    expect(screen.getByTestId('indexer-health-card-loading')).toBeDefined();
    expect(screen.getByText('Loading indexer status...')).toBeDefined();
  });

  it('renders error state with retry button', () => {
    const onRefresh = vi.fn();
    render(<IndexerHealthCard error={new Error('Network disconnected')} onRefresh={onRefresh} />);
    expect(screen.getByTestId('indexer-health-card-error')).toBeDefined();
    expect(screen.getByText(/Network disconnected/)).toBeDefined();

    const retryBtn = screen.getByText('Retry');
    retryBtn.click();
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders healthy status with both text and color cues', () => {
    const mockData: IndexerStatsResponse = {
      cursorLedger: 125000,
      latestLedger: 125000,
      lag: 0,
      status: 'healthy',
      mockMode: false,
    };

    render(<IndexerHealthCard data={mockData} />);
    expect(screen.getByTestId('status-text').textContent).toBe('Healthy');
    expect(screen.getByTestId('cursor-ledger').textContent).toBe('125,000');
    expect(screen.getByTestId('latest-ledger').textContent).toBe('125,000');
    expect(screen.getByTestId('ledger-lag').textContent).toBe('0');
    expect(screen.getByText('Ingestion is fully up-to-date with current ledger.')).toBeDefined();
    expect(screen.queryByTestId('mock-mode-notice')).toBeNull();
  });

  it('renders syncing status when indexer is catching up', () => {
    const mockData: IndexerStatsResponse = {
      cursorLedger: 124995,
      latestLedger: 125000,
      lag: 5,
      status: 'syncing',
      mockMode: false,
    };

    render(<IndexerHealthCard data={mockData} />);
    expect(screen.getByTestId('status-text').textContent).toBe('Syncing');
    expect(screen.getByTestId('ledger-lag').textContent).toBe('5');
    expect(screen.getByText('Indexer is catching up with recent network ledgers.')).toBeDefined();
  });

  it('renders degraded status when indexer has high lag', () => {
    const mockData: IndexerStatsResponse = {
      cursorLedger: 120000,
      latestLedger: 125000,
      lag: 5000,
      status: 'degraded',
      mockMode: false,
    };

    render(<IndexerHealthCard data={mockData} />);
    expect(screen.getByTestId('status-text').textContent).toBe('Degraded');
    expect(screen.getByTestId('ledger-lag').textContent).toBe('5,000');
    expect(screen.getByText('Indexer lag is elevated; ingestion is delayed.')).toBeDefined();
  });

  it('renders stalled status when indexer is stopped', () => {
    const mockData: IndexerStatsResponse = {
      cursorLedger: 100000,
      latestLedger: 125000,
      lag: 25000,
      status: 'stalled',
      mockMode: false,
    };

    render(<IndexerHealthCard data={mockData} />);
    expect(screen.getByTestId('status-text').textContent).toBe('Stalled');
    expect(screen.getByTestId('ledger-lag').textContent).toBe('25,000');
    expect(screen.getByText('Cursor has halted and is no longer advancing.')).toBeDefined();
  });

  it('explains mock mode when reported in payload', () => {
    const mockData: IndexerStatsResponse = {
      cursorLedger: 500,
      latestLedger: 500,
      lag: 0,
      status: 'healthy',
      mockMode: true,
    };

    render(<IndexerHealthCard data={mockData} />);
    const notice = screen.getByTestId('mock-mode-notice');
    expect(notice).toBeDefined();
    expect(notice.textContent).toContain('Mock Mode Active');
    expect(notice.textContent).toContain('simulated mode');
  });
});
