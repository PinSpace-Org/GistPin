'use client';

import { useRef, useState } from 'react';

interface Template {
  id: string;
  label: string;
  width: number;
  height: number;
}

const TEMPLATES: Template[] = [
  { id: 'twitter',   label: 'Twitter / X',  width: 1200, height: 630  },
  { id: 'instagram', label: 'Instagram',     width: 1080, height: 1080 },
  { id: 'linkedin',  label: 'LinkedIn',      width: 1200, height: 627  },
];

interface Metric {
  label: string;
  value: string;
}

const METRICS: Metric[] = [
  { label: 'Daily Active Users', value: '4,200' },
  { label: 'Gists Created Today', value: '1,847' },
  { label: 'Engagement Rate', value: '38%' },
  { label: 'Retention Rate', value: '62%' },
];

function drawCard(
  canvas: HTMLCanvasElement,
  template: Template,
  metric: Metric,
) {
  const { width, height } = template;
  canvas.width  = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#4f46e5');
  grad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle grid overlay
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // Header bar
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, width, 90);

  // Logo circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(60, 45, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GP', 60, 45);

  // Brand name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(width * 0.028)}px Arial`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('GistPin Analytics', 100, 45);

  // Template label (top-right)
  ctx.font = `${Math.round(width * 0.018)}px Arial`;
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText(template.label, width - 30, 45);

  // Main metric value
  const centerY = height * 0.48;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(width * 0.12)}px Arial`;
  ctx.textBaseline = 'middle';
  ctx.fillText(metric.value, width / 2, centerY);

  // Metric label
  ctx.font = `${Math.round(width * 0.032)}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(metric.label, width / 2, centerY + Math.round(width * 0.09));

  // Mini bar chart thumbnail
  const barData = [65, 80, 55, 90, 70, 85, 95];
  const barW = Math.round(width * 0.06);
  const barGap = Math.round(width * 0.015);
  const maxBarH = Math.round(height * 0.12);
  const chartX = width / 2 - ((barW + barGap) * barData.length) / 2;
  const chartY = height - Math.round(height * 0.22);
  barData.forEach((val, i) => {
    const bh = Math.round((val / 100) * maxBarH);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect?: (...a: unknown[]) => void }).roundRect?.(
      chartX + i * (barW + barGap), chartY - bh, barW, bh, 4,
    ) ?? ctx.fillRect(chartX + i * (barW + barGap), chartY - bh, barW, bh);
    ctx.fill();
  });

  // Footer
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, height - 54, width, 54);
  ctx.font = `${Math.round(width * 0.022)}px Arial`;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Powered by GistPin Analytics', width / 2, height - 27);
}

export default function SocialCardGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [templateId, setTemplateId] = useState('twitter');
  const [metricIdx, setMetricIdx] = useState(0);
  const [rendered, setRendered] = useState(false);

  const template = TEMPLATES.find((t) => t.id === templateId)!;
  const metric   = METRICS[metricIdx];

  function handleGenerate() {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, template, metric);
    setRendered(true);
  }

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `gistpin-${templateId}-card.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  }

  // Preview scale so the canvas fits the UI
  const previewScale = Math.min(1, 560 / template.width);

  return (
    <div style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Platform template
          <select
            value={templateId}
            onChange={(e) => { setTemplateId(e.target.value); setRendered(false); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label} ({t.width}×{t.height})</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, color: '#374151' }}>
          Key metric
          <select
            value={metricIdx}
            onChange={(e) => { setMetricIdx(Number(e.target.value)); setRendered(false); }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
          >
            {METRICS.map((m, i) => (
              <option key={m.label} value={i}>{m.label}</option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <button
            onClick={handleGenerate}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
          >
            Generate Card
          </button>
          {rendered && (
            <button
              onClick={handleDownload}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
            >
              Download PNG
            </button>
          )}
        </div>
      </div>

      {/* Canvas preview */}
      <div style={{ overflowX: 'auto' }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: template.width * previewScale,
            height: template.height * previewScale,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: rendered ? undefined : '#f1f5f9',
          }}
        />
        {!rendered && (
          <p style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
            Select a template and metric, then click &quot;Generate Card&quot; to preview.
          </p>
        )}
      </div>
    </div>
  );
}
