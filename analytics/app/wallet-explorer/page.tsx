'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import WalletActivity from '@/components/WalletActivity';

function isValidStellarAddress(addr: string) {
  return /^G[A-Z2-7]{55}$/.test(addr);
}

export default function WalletExplorerPage() {
  const [input,   setInput]   = useState('');
  const [address, setAddress] = useState('');
  const [error,   setError]   = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!isValidStellarAddress(trimmed)) {
      setError('Invalid Stellar address — must start with G and be 56 characters.');
      return;
    }
    setError('');
    setAddress(trimmed);
  }

  // Demo address for convenience
  const DEMO = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, fontWeight: 800, color: '#111827' }}>Wallet Explorer</h1>
        <p style={{ margin: 0, color: '#475569' }}>Search and explore activity for any Stellar wallet address.</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter Stellar address (G…)"
            style={{ width: '100%', paddingLeft: 40, padding: '12px 16px 12px 40px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <button
          type="submit"
          style={{ padding: '0 24px', borderRadius: 10, background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
        >
          Search
        </button>
      </form>

      {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 8px' }}>{error}</p>}

      <button
        onClick={() => { setInput(DEMO); setAddress(DEMO); setError(''); }}
        style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', marginBottom: 28 }}
      >
        Use demo address
      </button>

      {/* Activity panel */}
      {address ? (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)', padding: '28px 32px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Address</div>
            <div style={{ fontFamily: 'monospace', fontSize: 14, color: '#111827', wordBreak: 'break-all' }}>{address}</div>
          </div>
          <WalletActivity address={address} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
          <Search size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: 15 }}>Enter a Stellar address to view its activity.</p>
        </div>
      )}
    </main>
  );
}
