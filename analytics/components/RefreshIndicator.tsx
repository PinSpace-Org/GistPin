'use client';

import { useRefresh } from '@/hooks/useRefresh';

export default function RefreshIndicator() {
  const { lastUpdatedLabel, isRefreshing, autoRefresh, setAutoRefresh, toast, refresh } =
    useRefresh();

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 18px',
          borderRadius: 14,
          background: '#dbeafe',
          border: '1px solid #93c5fd',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e3a8a' }}>
            Last updated: {lastUpdatedLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            style={{
              border: 'none',
              borderRadius: 999,
              background: isRefreshing ? '#93c5fd' : '#1d4ed8',
              color: '#ffffff',
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: isRefreshing ? 'wait' : 'pointer',
            }}
          >
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 24,
            bottom: 24,
            background: '#0f766e',
            color: '#ffffff',
            padding: '14px 16px',
            borderRadius: 16,
            boxShadow: '0 16px 36px rgba(15,118,110,0.28)',
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}
    </>
  );
}
