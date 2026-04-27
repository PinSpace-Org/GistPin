'use client';

import { Chart as ChartJS, LineElement, PointElement, LineController, CategoryScale, LinearScale } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LineController, CategoryScale, LinearScale);

export default function Sparkline({ data }: { data: number[] }) {
  const trendUp = data[data.length - 1] >= data[0];
  return (
    <div style={{ width: 50, height: 20 }}>
      <Line
        data={{
          labels: data.map((_, i) => i),
          datasets: [{ data, borderColor: trendUp ? '#16a34a' : '#dc2626', borderWidth: 1.5, tension: 0.4, pointRadius: 0 }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
          animation: false,
        }}
      />
    </div>
  );
}
