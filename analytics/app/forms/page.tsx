'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const forms = [
  {
    name: 'Post a Gist',
    completionRate: 78,
    avgTimeToComplete: 42,
    fields: [
      { name: 'Title', abandonment: 5, errors: 12 },
      { name: 'Content', abandonment: 14, errors: 8 },
      { name: 'Location', abandonment: 22, errors: 31 },
      { name: 'Tags', abandonment: 18, errors: 5 },
    ],
  },
  {
    name: 'Register',
    completionRate: 61,
    avgTimeToComplete: 95,
    fields: [
      { name: 'Username', abandonment: 8, errors: 20 },
      { name: 'Email', abandonment: 12, errors: 15 },
      { name: 'Password', abandonment: 25, errors: 42 },
      { name: 'Confirm Password', abandonment: 30, errors: 38 },
    ],
  },
  {
    name: 'Edit Profile',
    completionRate: 85,
    avgTimeToComplete: 60,
    fields: [
      { name: 'Display Name', abandonment: 4, errors: 6 },
      { name: 'Bio', abandonment: 10, errors: 3 },
      { name: 'Avatar', abandonment: 20, errors: 9 },
    ],
  },
];

function FormCard({ form }: { form: (typeof forms)[0] }) {
  const data = {
    labels: form.fields.map((f) => f.name),
    datasets: [
      {
        label: 'Abandonment %',
        data: form.fields.map((f) => f.abandonment),
        backgroundColor: 'rgba(239,68,68,0.75)',
        borderRadius: 3,
      },
      {
        label: 'Error frequency',
        data: form.fields.map((f) => f.errors),
        backgroundColor: 'rgba(245,158,11,0.75)',
        borderRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      x: { ticks: { color: '#9ca3af' }, grid: { display: false }, border: { color: '#e5e7eb' } },
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(0,0,0,0.05)' },
        border: { display: false },
      },
    },
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#374151', font: { size: 11 } } },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f9fafb',
        bodyColor: '#d1d5db',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: (item: TooltipItem<'bar'>) => ` ${item.dataset.label}: ${item.raw}` },
      },
    },
  };

  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>{form.name}</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '10px 16px', border: '1px solid #bbf7d0' }}>
          <div style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>Completion Rate</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>{form.completionRate}%</div>
        </div>
        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 16px', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 700 }}>Avg Time to Complete</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a' }}>{form.avgTimeToComplete}s</div>
        </div>
      </div>
      <Bar data={data} options={options} />
    </div>
  );
}

export default function FormsPage() {
  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '6px 12px', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
          Form Analytics
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 36, lineHeight: 1.05 }}>Form Analytics Dashboard</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: 16 }}>
          Completion rates, field-level abandonment, time to complete, and error frequency.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {forms.map((form) => (
          <FormCard key={form.name} form={form} />
        ))}
      </div>
    </main>
  );
}
