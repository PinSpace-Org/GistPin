'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem, Plugin } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const engagementData = [
  { label: 'Views',    count: 9840, color: 'rgba(99, 102, 241, 0.85)',  border: 'rgba(99, 102, 241, 1)'  },
  { label: 'Likes',   count: 4820, color: 'rgba(34, 197, 94, 0.85)',   border: 'rgba(34, 197, 94, 1)'   },
  { label: 'Shares',  count: 1540, color: 'rgba(59, 130, 246, 0.85)',  border: 'rgba(59, 130, 246, 1)'  },
  { label: 'Comments',count: 2310, color: 'rgba(251, 146, 60, 0.85)',  border: 'rgba(251, 146, 60, 1)'  },
];

const centerTextPlugin: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea: { top, bottom, left, right } } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const total = (chart.data.datasets[0].data as number[]).reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#111827';
    ctx.fillText(total.toLocaleString(), cx, cy - 10);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.fillText('Total', cx, cy + 12);
    ctx.restore();
  },
};

export default function EngagementDonutChart() {
  const total = engagementData.reduce((sum, d) => sum + d.count, 0);

  const data = {
    labels: engagementData.map((d) => d.label),
    datasets: [{
      data: engagementData.map((d) => d.count),
      backgroundColor: engagementData.map((d) => d.color),
      borderColor: engagementData.map((d) => d.border),
      borderWidth: 2,
      hoverOffset: 16,
    }],
  };

  const options = {
    responsive: true,
    cutout: '62%',
    animation: { animateRotate: true, animateScale: true, duration: 800 },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyleWidth: 10,
          generateLabels: (chart: ChartJS) => {
            const dataset = chart.data.datasets[0];
            return (chart.data.labels as string[]).map((label, i) => {
              const value = dataset.data[i] as number;
              const pct = ((value / total) * 100).toFixed(1);
              return {
                text: `${label} (${pct}%)`,
                fillStyle: (dataset.backgroundColor as string[])[i],
                strokeStyle: (dataset.borderColor as string[])[i],
                hidden: !chart.getDataVisibility(i),
                index: i,
                datasetIndex: 0,
                lineWidth: 2,
                pointStyle: 'circle' as const,
              };
            });
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (item: TooltipItem<'doughnut'>) => {
            const value = item.raw as number;
            const pct = ((value / total) * 100).toFixed(1);
            return `  ${item.label}: ${value.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}
