'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const COHORTS = [
  { cohort: 'Week 1',  new: 1200, retained: { w1: 680, w2: 420, w3: 310, w4: 240 } },
  { cohort: 'Week 2',  new: 1450, retained: { w1: 820, w2: 510, w3: 380, w4: 290 } },
  { cohort: 'Week 3',  new: 1320, retained: { w1: 740, w2: 460, w3: 340, w4: 260 } },
  { cohort: 'Week 4',  new: 1580, retained: { w1: 890, w2: 550, w3: 410, w4: 310 } },
  { cohort: 'Week 5',  new: 1400, retained: { w1: 790, w2: 490, w3: 360, w4: 270 } },
  { cohort: 'Week 6',  new: 1650, retained: { w1: 930, w2: 580, w3: 430, w4: 330 } },
  { cohort: 'Week 7',  new: 1530, retained: { w1: 860, w2: 530, w3: 390, w4: 300 } },
  { cohort: 'Week 8',  new: 1710, retained: { w1: 960, w2: 600, w3: 450, w4: 350 } },
];

const WEEKS = ['W1', 'W2', 'W3', 'W4'];

export default function GrowthCohort() {
  const chartData = {
    labels: COHORTS.map((c) => c.cohort),
    datasets: WEEKS.map((wk, wi) => ({
      label: wk,
      data: COHORTS.map((c) => c.retained[`w${wi + 1}` as keyof typeof c.retained]),
      backgroundColor: [`rgba(59,130,246,${0.9 - wi * 0.15})`, `rgba(34,197,94,${0.9 - wi * 0.15})`, `rgba(251,191,36,${0.9 - wi * 0.15})`, `rgba(239,68,68,${0.9 - wi * 0.15})`][wi],
      borderRadius: 2,
    })),
  };

  return (
    <div>
      <Bar
        data={chartData}
        options={{
          responsive: true,
          plugins: { legend: { position: 'top' }, title: { display: true, text: 'Weekly Cohort Retention', font: { size: 14 } } },
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Users' } },
          },
        }}
        height={100}
      />

      <div style={{ overflowX: 'auto', marginTop: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '6px 10px' }}>Cohort</th>
              <th style={{ padding: '6px 10px' }}>New Users</th>
              <th style={{ padding: '6px 10px' }}>W1 Retained</th>
              <th style={{ padding: '6px 10px' }}>W2 Retained</th>
              <th style={{ padding: '6px 10px' }}>W3 Retained</th>
              <th style={{ padding: '6px 10px' }}>W4 Retained</th>
              <th style={{ padding: '6px 10px' }}>W4 Retention %</th>
            </tr>
          </thead>
          <tbody>
            {COHORTS.map((c) => {
              const w4Rate = Math.round((c.retained.w4 / c.new) * 100);
              return (
                <tr key={c.cohort} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 600 }}>{c.cohort}</td>
                  <td style={{ padding: '6px 10px' }}>{c.new}</td>
                  <td style={{ padding: '6px 10px' }}>{c.retained.w1}</td>
                  <td style={{ padding: '6px 10px' }}>{c.retained.w2}</td>
                  <td style={{ padding: '6px 10px' }}>{c.retained.w3}</td>
                  <td style={{ padding: '6px 10px' }}>{c.retained.w4}</td>
                  <td style={{ padding: '6px 10px', fontWeight: 600, color: w4Rate >= 20 ? '#22c55e' : w4Rate >= 16 ? '#eab308' : '#ef4444' }}>
                    {w4Rate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
