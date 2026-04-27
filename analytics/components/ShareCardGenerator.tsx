'use client';
import { useRef, useState } from 'react';

type Platform = 'twitter' | 'linkedin';

const PLATFORM_SIZES: Record<Platform, { width: number; height: number; label: string }> = {
  twitter: { width: 1200, height: 628, label: 'Twitter / X (1200×628)' },
  linkedin: { width: 1200, height: 627, label: 'LinkedIn (1200×627)' },
};

export interface ShareCardData {
  title: string;
  metric: string;
  value: string;
  subtitle?: string;
}

interface ShareCardGeneratorProps {
  data?: ShareCardData;
}

const DEFAULT_DATA: ShareCardData = {
  title: 'GistPin Analytics',
  metric: 'Total Gists',
  value: '24,891',
  subtitle: 'Last 30 days · gistpin.io',
};

export default function ShareCardGenerator({ data = DEFAULT_DATA }: ShareCardGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [cardData, setCardData] = useState<ShareCardData>(data);
  const [downloading, setDownloading] = useState(false);

  const { width, height } = PLATFORM_SIZES[platform];
  const scale = 400 / width; // preview scale

  function drawCard(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(1, '#312e81');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Branded header bar
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(0, 0, w, h * 0.08);

    // Logo / brand text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${h * 0.055}px Inter, sans-serif`;
    ctx.fillText('GistPin', w * 0.05, h * 0.065);

    // Main metric value
    ctx.fillStyle = '#a5b4fc';
    ctx.font = `${h * 0.07}px Inter, sans-serif`;
    ctx.fillText(cardData.metric, w * 0.05, h * 0.42);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${h * 0.22}px Inter, sans-serif`;
    ctx.fillText(cardData.value, w * 0.05, h * 0.72);

    // Title
    ctx.fillStyle = '#c7d2fe';
    ctx.font = `${h * 0.055}px Inter, sans-serif`;
    ctx.fillText(cardData.title, w * 0.05, h * 0.85);

    // Subtitle
    if (cardData.subtitle) {
      ctx.fillStyle = '#818cf8';
      ctx.font = `${h * 0.04}px Inter, sans-serif`;
      ctx.fillText(cardData.subtitle, w * 0.05, h * 0.93);
    }

    // Decorative circle
    ctx.beginPath();
    ctx.arc(w * 0.88, h * 0.5, h * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99,102,241,0.15)';
    ctx.fill();
  }

  function renderPreview() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCard(ctx, width, height);
  }

  function handleDownload() {
    setDownloading(true);
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) { setDownloading(false); return; }
    drawCard(ctx, width, height);
    offscreen.toBlob((blob) => {
      if (!blob) { setDownloading(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gistpin-share-${platform}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloading(false);
    }, 'image/png');
  }

  // Render preview on mount / change
  if (typeof window !== 'undefined') {
    setTimeout(renderPreview, 0);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold">Card Settings</h2>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent"
            >
              {(Object.keys(PLATFORM_SIZES) as Platform[]).map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_SIZES[p].label}
                </option>
              ))}
            </select>
          </div>

          {(
            [
              { key: 'title', label: 'Title' },
              { key: 'metric', label: 'Metric Label' },
              { key: 'value', label: 'Value' },
              { key: 'subtitle', label: 'Subtitle' },
            ] as { key: keyof ShareCardData; label: string }[]
          ).map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</label>
              <input
                value={cardData[key] ?? ''}
                onChange={(e) => setCardData((prev) => ({ ...prev, [key]: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent"
              />
            </div>
          ))}

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? 'Generating…' : 'Download PNG'}
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-lg border bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Preview</h2>
          <div
            style={{ width: 400, height: Math.round(height * scale), overflow: 'hidden', borderRadius: 8 }}
          >
            <canvas
              ref={canvasRef}
              style={{ width: 400, height: Math.round(height * scale) }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{PLATFORM_SIZES[platform].label}</p>
        </div>
      </div>
    </div>
  );
}
