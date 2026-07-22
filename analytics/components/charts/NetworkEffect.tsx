'use client';

import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  calculateValuePerUser,
  metcalfeLawCurve,
  detectCriticalMass,
  calculateGeographicDensity,
  calculateNetworkStrength,
} from '../../lib/network-metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface NetworkEffectProps {
  users: number[];
  activity: number[];
  timestamps: string[];
  geographicData?: {
    locations: Array<{
      region: string;
      userCount: number;
      activityLevel: number;
    }>;
  };
}

export default function NetworkEffect({
  users,
  activity,
  timestamps,
  geographicData,
}: NetworkEffectProps) {
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'metcalfe'>('value');

  const metrics = useMemo(() => {
    const valuePerUser = calculateValuePerUser(users, activity);
    const metcalfeValues = metcalfeLawCurve(users);
    const criticalMassIndex = detectCriticalMass(valuePerUser);
    const geographicDensity = geographicData
      ? calculateGeographicDensity(geographicData)
      : {};
    const networkStrength = calculateNetworkStrength({
      valuePerUser,
      metcalfeValues,
      criticalMassIndex,
      geographicDensity,
    });

    return {
      valuePerUser,
      metcalfeValues,
      criticalMassIndex,
      geographicDensity,
      networkStrength,
    };
  }, [users, activity, geographicData]);

  const chartData = useMemo(() => {
    const datasets = [];

    if (selectedMetric === 'value') {
      datasets.push({
        label: 'Value per User',
        data: metrics.valuePerUser,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      });
    } else {
      datasets.push({
        label: 'Metcalfe Law Curve',
        data: metrics.metcalfeValues,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        tension: 0.3,
      });
    }

    if (metrics.criticalMassIndex !== null) {
      datasets.push({
        label: 'Critical Mass',
        data: metrics.valuePerUser.map((_, index) =>
          index === metrics.criticalMassIndex ? metrics.valuePerUser[index] : null
        ),
        borderColor: 'rgb(255, 205, 86)',
        backgroundColor: 'rgba(255, 205, 86, 0.8)',
        pointRadius: 10,
        pointHoverRadius: 15,
        showLine: false,
      });
    }

    return {
      labels: timestamps,
      datasets,
    };
  }, [metrics, selectedMetric, timestamps]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Network Effect Visualization',
      },
      tooltip: {
        callbacks: {
          afterLabel: function (context: any) {
            if (context.dataset.label === 'Critical Mass') {
              return 'Inflection Point - Network effect accelerating';
            }
            return '';
          },
        },
      },
    },
    scales: {
      y: {
        display: true,
        title: {
          display: true,
          text: selectedMetric === 'value' ? 'Value per User' : 'Metcalfe Value',
        },
      },
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
        },
      },
    },
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={() => setSelectedMetric('value')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedMetric === 'value' ? '#4CAF50' : '#e0e0e0',
              color: selectedMetric === 'value' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Value per User
          </button>
          <button
            onClick={() => setSelectedMetric('metcalfe')}
            style={{
              padding: '8px 16px',
              backgroundColor: selectedMetric === 'metcalfe' ? '#4CAF50' : '#e0e0e0',
              color: selectedMetric === 'metcalfe' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Metcalfe Law
          </button>
        </div>
      </div>

      <div style={{ height: '400px', marginBottom: '20px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        <div style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
            Network Strength Score
          </h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            {(metrics.networkStrength * 100).toFixed(1)}%
          </p>
        </div>

        {metrics.criticalMassIndex !== null && (
          <div style={{ padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#856404' }}>
              Critical Mass
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
              Detected at index {metrics.criticalMassIndex}
            </p>
          </div>
        )}

        {Object.keys(metrics.geographicDensity).length > 0 && (
          <div style={{ padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '6px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#0c5460' }}>
              Geographic Coverage
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#0c5460' }}>
              {Object.keys(metrics.geographicDensity).length} regions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
