'use client'

import { useState } from 'react'

type ExportFormat = 'csv' | 'json' | 'excel'
type ExportStep = 'dateRange' | 'metrics' | 'format' | 'schedule'

interface DateRange {
  start: string
  end: string
}

interface MetricOption {
  id: string
  label: string
  description: string
}

interface ScheduleConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  email: string
}

const AVAILABLE_METRICS: MetricOption[] = [
  { id: 'page_views', label: 'Page Views', description: 'Total page view count' },
  { id: 'unique_visitors', label: 'Unique Visitors', description: 'Distinct visitor count' },
  { id: 'avg_session_duration', label: 'Avg Session Duration', description: 'Average session length' },
  { id: 'bounce_rate', label: 'Bounce Rate', description: 'Single-page session ratio' },
  { id: 'top_gists', label: 'Top Gists', description: 'Most viewed gists' },
  { id: 'engagement_rate', label: 'Engagement Rate', description: 'User interaction ratio' },
]

const STEPS: { key: ExportStep; label: string }[] = [
  { key: 'dateRange', label: 'Date Range' },
  { key: 'metrics', label: 'Metrics' },
  { key: 'format', label: 'Format' },
  { key: 'schedule', label: 'Schedule' },
]

export default function ExportWizard() {
  const [currentStep, setCurrentStep] = useState<number>(0)
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' })
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false,
    frequency: 'weekly',
    email: '',
  })

  const handleMetricToggle = (id: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    )
  }

  const handleExport = () => {
    const payload = { dateRange, selectedMetrics, format, schedule }
    console.log('Export payload:', payload)
    alert(`Export configured!

Date range: ${dateRange.start} to ${dateRange.end}
Metrics: ${selectedMetrics.join(', ')}
Format: ${format}
Scheduled: ${schedule.enabled ? schedule.frequency : 'No'}`)
  }

  const canAdvance = (): boolean => {
    switch (currentStep) {
      case 0:
        return dateRange.start !== '' && dateRange.end !== ''
      case 1:
        return selectedMetrics.length > 0
      case 2:
        return true
      case 3:
        return !schedule.enabled || (schedule.email !== '')
      default:
        return false
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  }

  const renderDateRangeStep = () => (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
        Select Date Range
      </h3>
      <div style={{ display: 'grid', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: 'Last 7 days', days: 7 },
            { label: 'Last 30 days', days: 30 },
            { label: 'Last 90 days', days: 90 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setDate(end.getDate() - preset.days)
                setDateRange({
                  start: start.toISOString().split('T')[0],
                  end: end.toISOString().split('T')[0],
                })
              }}
              style={{
                padding: '6px 14px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  const renderMetricsStep = () => (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
        Select Metrics
      </h3>
      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>
        Choose at least one metric to include in the export.
      </p>
      <div style={{ display: 'grid', gap: '8px' }}>
        {AVAILABLE_METRICS.map((metric) => (
          <label
            key={metric.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              border: selectedMetrics.includes(metric.id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              background: selectedMetrics.includes(metric.id) ? '#eff6ff' : '#ffffff',
              transition: 'all 0.15s',
            }}
          >
            <input
              type="checkbox"
              checked={selectedMetrics.includes(metric.id)}
              onChange={() => handleMetricToggle(metric.id)}
              style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
            />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{metric.label}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{metric.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )

  const renderFormatStep = () => {
    const formats: { value: ExportFormat; label: string; description: string; icon: string }[] = [
      { value: 'csv', label: 'CSV', description: 'Comma-separated values, compatible with spreadsheets', icon: '.csv' },
      { value: 'json', label: 'JSON', description: 'Structured data format for programmatic use', icon: '.json' },
      { value: 'excel', label: 'Excel', description: 'Microsoft Excel workbook with formatting', icon: '.xlsx' },
    ]

    return (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
          Choose Export Format
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {formats.map((f) => (
            <label
              key={f.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '16px',
                border: format === f.value ? '2px solid #2563eb' : '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                background: format === f.value ? '#eff6ff' : '#ffffff',
              }}
            >
              <input
                type="radio"
                name="format"
                checked={format === f.value}
                onChange={() => setFormat(f.value)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: '#6b7280',
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{f.label}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{f.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    )
  }

  const renderScheduleStep = () => (
    <div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#111827' }}>
        Schedule Export
      </h3>
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
          }}
        >
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
            style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
          />
          Enable scheduled exports
        </label>
      </div>
      {schedule.enabled && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Frequency</label>
            <select
              value={schedule.frequency}
              onChange={(e) =>
                setSchedule((prev) => ({
                  ...prev,
                  frequency: e.target.value as ScheduleConfig['frequency'],
                }))
              }
              style={inputStyle}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notification Email</label>
            <input
              type="email"
              value={schedule.email}
              onChange={(e) => setSchedule((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return renderDateRangeStep()
      case 1:
        return renderMetricsStep()
      case 2:
        return renderFormatStep()
      case 3:
        return renderScheduleStep()
      default:
        return null
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Export Analytics Data
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          Configure and export your platform analytics step by step.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px' }}>
        {STEPS.map((step, index) => (
          <div
            key={step.key}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: index <= currentStep ? '#2563eb' : '#e5e7eb',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {STEPS.map((step, index) => (
          <button
            key={step.key}
            onClick={() => index < currentStep && setCurrentStep(index)}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 500,
              border: 'none',
              cursor: index <= currentStep ? 'pointer' : 'default',
              background: index === currentStep ? '#2563eb' : index < currentStep ? '#dbeafe' : '#f3f4f6',
              color: index === currentStep ? '#ffffff' : index < currentStep ? '#1e40af' : '#9ca3af',
            }}
          >
            {index + 1}. {step.label}
          </button>
        ))}
      </div>

      <div style={cardStyle}>{renderStep()}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <button
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #d1d5db',
            background: '#ffffff',
            color: currentStep === 0 ? '#d1d5db' : '#374151',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Back
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button
            onClick={() => setCurrentStep((prev) => prev + 1)}
            disabled={!canAdvance()}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              background: canAdvance() ? '#2563eb' : '#d1d5db',
              color: '#ffffff',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleExport}
            disabled={!canAdvance()}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              background: canAdvance() ? '#059669' : '#d1d5db',
              color: '#ffffff',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
            }}
          >
            Export Data
          </button>
        )}
      </div>
    </div>
  )
}