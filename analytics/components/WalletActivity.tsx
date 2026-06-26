'use client';

import { Download } from 'lucide-react';

export interface WalletEntry {
  txHash: string;
  action: 'post' | 'edit' | 'pin' | 'tip';
  gistId: string;
  timestamp: number;
  amount?: number;
}

export interface WalletData {
  address: string;
  gistCount: number;
  firstSeen: number;
  lastSeen: number;
  history: WalletEntry[];
}

function mockWallet(address: string): WalletData {
  const now = Date.now();
  const history: WalletEntry[] = Array.from({ length: 20 }, (_, i) => ({
    txHash: `tx_${Math.random().toString(36).slice(2, 10)}`,
    action: (['post', 'edit', 'pin', 'tip'] as const)[Math.floor(Math.random() * 4)],
    gistId: `gist_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now - (20 - i) * 86_400_000 * Math.random() * 3,
    amount: Math.random() > 0.5 ? parseFloat((Math.random() * 5).toFixed(2)) : undefined,
  }));
  return {
    address,
    gistCount: history.filter((h) => h.action === 'post').length,
    firstSeen: Math.min(...history.map((h) => h.timestamp)),
    lastSeen:  Math.max(...history.map((h) => h.timestamp)),
    history,
  };
}

const ACTION_COLOR: Record<string, string> = {
  post: '#6366f1', edit: '#f59e0b', pin: '#22c55e', tip: '#ec4899',
};

function fmt(ts: number) {
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function WalletActivity({ address }: { address: string }) {
  const data = mockWallet(address);

  function handleExport() {
    const csv = ['TxHash,Action,GistId,Timestamp,Amount',
      ...data.history.map((e) =>
        `${e.txHash},${e.action},${e.gistId},${new Date(e.timestamp).toISOString()},${e.amount ?? ''}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `wallet-${address.slice(0, 8)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Gists', value: data.gistCount },
          { label: 'Total Actions', value: data.history.length },
          { label: 'First Seen', value: fmt(data.firstSeen) },
          { label: 'Last Seen',  value: fmt(data.lastSeen)  },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginTop: 6, wordBreak: 'break-all' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#374151' }}>Activity Timeline</h3>
        <button
          onClick={handleExport}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}
        >
          <Download size={13} /> Export
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...data.history].sort((a, b) => b.timestamp - a.timestamp).map((entry) => (
          <div key={entry.txHash} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb' }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: `${ACTION_COLOR[entry.action]}18`, color: ACTION_COLOR[entry.action], fontSize: 11, fontWeight: 700, textTransform: 'capitalize', minWidth: 40, textAlign: 'center' }}>
              {entry.action}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{entry.gistId}</span>
            {entry.amount != null && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ec4899' }}>{entry.amount} XLM</span>
            )}
            <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmt(entry.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
