'use client';

import { useState } from 'react';
import { downloadAnalyticsWorkbook } from '@/lib/excel-export';

export default function ExcelExportButton() {
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = () => {
    downloadAnalyticsWorkbook();
    setStatus('Workbook generated with Overview, Users, Locations, and Engagement sheets.');
    window.setTimeout(() => setStatus(null), 1500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <button
        type="button"
        onClick={handleExport}
        style={{
          border: 'none',
          borderRadius: 999,
          background: '#166534',
          color: '#ffffff',
          padding: '12px 18px',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 12px 30px rgba(22,101,52,0.20)',
        }}
      >
        Download Excel Workbook
      </button>

      {status && (
        <span style={{ fontSize: 12, color: '#166534' }}>
          {status}
        </span>
      )}
    </div>
  );
}
