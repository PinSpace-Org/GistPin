'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  AlertTriangle,
  Activity,
  Zap,
  Layers,
  Clock,
  CheckCircle2,
  TrendingDown,
  Server,
  Database,
  Globe,
  Radio,
  Sliders,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  MONITORED_METRICS,
  detectCompositeAlerts,
  getMockHistoricalAlerts,
  getResolutionPerformanceStats,
  generateSynchronizedTelemetryTimeline,
  computeCorrelationMatrix,
  type CompositeAlert,
  type IssueClassification,
  type AlertSeverity,
} from '@/lib/composite-alert-detector';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export default function CompositeAlertsPage() {
  const [sensitivity, setSensitivity] = useState(55);
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<CompositeAlert | null>(null);

  // Synchronized telemetry timeline
  const telemetry = useMemo(() => generateSynchronizedTelemetryTimeline(24), []);

  // Compute live active composite alerts based on telemetry & sensitivity
  const liveMetricsInput = useMemo(() => {
    return [
      {
        metricId: 'api_latency_p99',
        currentValue: telemetry.apiLatency[telemetry.apiLatency.length - 1],
        baselineMean: 150,
        baselineStd: 35,
        timestamp: Date.now(),
      },
      {
        metricId: 'api_5xx_error_rate',
        currentValue: telemetry.errorRate[telemetry.errorRate.length - 1],
        baselineMean: 0.2,
        baselineStd: 0.1,
        timestamp: Date.now(),
      },
      {
        metricId: 'db_connection_pool_saturation',
        currentValue: telemetry.dbSaturation[telemetry.dbSaturation.length - 1],
        baselineMean: 40,
        baselineStd: 8,
        timestamp: Date.now(),
      },
      {
        metricId: 'indexer_block_lag',
        currentValue: telemetry.indexerLag[telemetry.indexerLag.length - 1],
        baselineMean: 2,
        baselineStd: 1,
        timestamp: Date.now(),
      },
    ];
  }, [telemetry]);

  const liveDetectedAlerts = useMemo(() => {
    return detectCompositeAlerts(liveMetricsInput, { sensitivityThreshold: sensitivity });
  }, [liveMetricsInput, sensitivity]);

  const historicalAlerts = useMemo(() => getMockHistoricalAlerts(), []);

  const allAlerts = useMemo(() => {
    return [...liveDetectedAlerts, ...historicalAlerts];
  }, [liveDetectedAlerts, historicalAlerts]);

  const filteredAlerts = useMemo(() => {
    if (selectedClassification === 'all') return allAlerts;
    return allAlerts.filter((a) => a.classification === selectedClassification);
  }, [allAlerts, selectedClassification]);

  // Correlation matrix
  const correlations = useMemo(() => {
    return computeCorrelationMatrix({
      api_latency: telemetry.apiLatency,
      error_rate: telemetry.errorRate,
      db_saturation: telemetry.dbSaturation,
      indexer_lag: telemetry.indexerLag,
    });
  }, [telemetry]);

  // Resolution metrics
  const resolutionStats = useMemo(() => getResolutionPerformanceStats(), []);

  // Chart configs
  const timelineChartData = {
    labels: telemetry.timestamps,
    datasets: [
      {
        label: 'API P99 Latency (ms)',
        data: telemetry.apiLatency,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        yAxisID: 'y',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
      },
      {
        label: 'DB Saturation (%)',
        data: telemetry.dbSaturation,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        yAxisID: 'y1',
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2,
      },
      {
        label: 'Composite Anomaly Score',
        data: telemetry.compositeScores,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        fill: true,
        yAxisID: 'y1',
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ef4444',
      },
    ],
  };

  const timelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          color: '#6b7280',
          font: { size: 12, weight: 600 as const },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'Latency (ms)', color: '#6366f1' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: '#9ca3af' },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Score / Saturation (%)', color: '#ef4444' },
        grid: { drawOnChartArea: false },
        min: 0,
        max: 100,
        ticks: { color: '#9ca3af' },
      },
    },
  };

  const mttrBarData = {
    labels: resolutionStats.map((s) => s.label),
    datasets: [
      {
        label: 'MTTD (Minutes to Detect)',
        data: resolutionStats.map((s) => s.avgMttdMinutes),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      },
      {
        label: 'MTTR (Minutes to Resolve)',
        data: resolutionStats.map((s) => s.avgMttrMinutes),
        backgroundColor: 'rgba(99, 102, 241, 0.85)',
        borderRadius: 4,
      },
    ],
  };

  const mttrBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 12, color: '#6b7280' },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          maxRotation: 25,
          minRotation: 25,
        },
      },
      y: {
        title: { display: true, text: 'Minutes' },
        grid: { color: 'rgba(229, 231, 235, 0.5)' },
        ticks: { color: '#9ca3af' },
      },
    },
  };

  const activeAlertCount = allAlerts.filter((a) => a.status === 'active').length;
  const systemicCount = allAlerts.filter((a) => a.classification === 'systemic').length;
  const avgMTTR = (
    resolutionStats.reduce((s, r) => s + r.avgMttrMinutes, 0) / resolutionStats.length
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
              <Layers size={26} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Multi-Metric Composite Alert Analyzer
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track simultaneous metric deviations, isolate root causes, and mitigate cascading systemic failures.
              </p>
            </div>
          </div>
        </div>

        {/* Sensitivity slider */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <Sliders size={18} className="text-indigo-500" />
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-xs font-semibold text-gray-600 dark:text-gray-300">
              <span>Threshold Sensitivity</span>
              <span className="text-indigo-600 dark:text-indigo-400">{sensitivity}%</span>
            </div>
            <input
              type="range"
              min={30}
              max={85}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-36 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Composite Alerts</span>
            <Activity size={18} className="text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{activeAlertCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              High Priority
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Synchronously deviating metric channels</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Systemic Outage Rate</span>
            <Zap size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{systemicCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              Cross-Subsystem
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Impacting &ge;3 core infrastructure layers</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mean Time to Detect (MTTD)</span>
            <Clock size={18} className="text-blue-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">42s</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              -18% vs prev
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Automated multi-metric anomaly trigger</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg MTTR</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{avgMTTR}m</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              Within SLA
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Mean time to full service restoration</p>
        </div>
      </div>

      {/* Main Synchronized Timeline Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="text-indigo-600" size={20} />
              Synchronized Multi-Metric Telemetry Stream
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cross-subsystem telemetry with shaded composite anomaly threshold triggers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            Real-time feed (5m resolution)
          </div>
        </div>

        <div className="h-80 w-full">
          <Line data={timelineChartData} options={timelineChartOptions} />
        </div>
      </div>

      {/* Correlation & Cascade Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Multi-Metric Correlation Matrix */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                Cross-Metric Correlation Matrix
              </h2>
              <span className="text-xs font-semibold text-gray-400">Pearson Coeff (r)</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Measures synchronous co-movement and estimated lag between subsystem anomalies.
            </p>

            <div className="space-y-3">
              {correlations.map((c, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <span className="capitalize">{c.sourceMetric.replace('_', ' ')}</span>
                      <span className="text-gray-400">&harr;</span>
                      <span className="capitalize">{c.targetMetric.replace('_', ' ')}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      <span>Lag: ~{c.lagSeconds}s</span>
                      <span>&bull;</span>
                      <span>Causality: {c.causalityLikelihood}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                        c.relationshipStrength === 'strong'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                      }`}
                    >
                      r = {c.correlationCoeff}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
            <strong>Systemic Rule:</strong> High correlation ($r &ge; 0.75$) between PostGIS saturation and API latency indicates database-induced bottleneck cascade.
          </div>
        </div>

        {/* Resolution Time & MTTR Performance */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingDown size={18} className="text-emerald-500" />
                Resolution Time by Issue Classification (MTTD & MTTR)
              </h2>
              <p className="text-xs text-gray-500">
                Breakdown of response and resolution duration across systemic vs isolated categories.
              </p>
            </div>
          </div>

          <div className="h-64 w-full mb-4">
            <Bar data={mttrBarData} options={mttrBarOptions} />
          </div>

          {/* Table summary of SLA breaches */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <span className="text-gray-400 block">Systemic MTTR</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">18.5 min</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <span className="text-gray-400 block">Isolated MTTR</span>
              <span className="font-bold text-gray-900 dark:text-white text-sm">8.2 min</span>
            </div>
            <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
              <span className="text-gray-400 block">SLA Compliance</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">97.8%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Composite Alerts Feed & Cascade Inspector */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 lg:p-7 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-500" size={20} />
              Detected Composite Alerts & Incident Cascades
            </h2>
            <p className="text-xs text-gray-500">
              Select an incident to view full root cause cascade trajectory and blast radius analysis.
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl text-xs font-semibold">
            {['all', 'systemic', 'cascade_threat', 'isolated'].map((f) => (
              <button
                key={f}
                onClick={() => setSelectedClassification(f)}
                className={`px-3 py-1.5 rounded-xl transition-all capitalize ${
                  selectedClassification === f
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const isSystemic = alert.classification === 'systemic';
            const isThreat = alert.classification === 'cascade_threat';
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedAlert?.id === alert.id
                    ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-gray-50/50 dark:bg-gray-900/50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          isSystemic
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : isThreat
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {alert.classification.replace('_', ' ')}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          alert.severity === 'emergency'
                            ? 'bg-red-500 text-white'
                            : alert.severity === 'critical'
                            ? 'bg-orange-500 text-white'
                            : 'bg-amber-400 text-gray-900'
                        }`}
                      >
                        Score: {alert.compositeScore}/100
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {alert.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Server size={14} className="text-indigo-500" />
                        Root Subsystem: <strong>{alert.rootCauseCategory.toUpperCase()}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Affected Subsystems: <strong>{alert.affectedSubsystems.join(', ')}</strong>
                      </span>
                      <span>&bull;</span>
                      <span>
                        Blast Radius: <strong>~{alert.blastRadius.estimatedAffectedUsers.toLocaleString()} users</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      View Cascade Flow <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Cascade Chain Visualizer (if selected) */}
                {selectedAlert?.id === alert.id && (
                  <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                        Alert Propagation Cascade Timeline
                      </h4>
                      <span className="text-xs text-gray-400">
                        Total steps: {alert.cascadeChain.length}
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200 dark:before:bg-indigo-900">
                      {alert.cascadeChain.map((step) => (
                        <div key={step.stepIndex} className="relative flex items-start gap-3">
                          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950 flex items-center justify-center text-[9px] font-bold text-white">
                            {step.stepIndex}
                          </div>
                          <div className="flex-1 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-gray-900 dark:text-white font-bold">
                                {step.metricName}
                              </span>
                              <span className="text-gray-400 font-mono">
                                +{step.offsetSeconds}s offset
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                              {step.impactDescription}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommended Actions */}
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                      <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                        Recommended SRE Mitigation Actions
                      </h5>
                      <ul className="list-disc list-inside space-y-1 text-xs text-indigo-800 dark:text-indigo-300">
                        {alert.recommendedActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
