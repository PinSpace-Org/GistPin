'use client';

import { useMemo, useState } from 'react';

interface CalendarEvent {
  date: string;
  title: string;
  description: string;
  category: 'platform' | 'milestone' | 'release' | 'marketing';
  impact: 'low' | 'medium' | 'high';
}

interface EventsCalendarProps {
  events: CalendarEvent[];
}

const categoryColors: Record<CalendarEvent['category'], string> = {
  platform: '#6366f1',
  milestone: '#f59e0b',
  release: '#10b981',
  marketing: '#ec4899',
};

const impactColors: Record<CalendarEvent['impact'], string> = {
  low: '#94a3b8',
  medium: '#f59e0b',
  high: '#ef4444',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function EventsCalendar({ events }: EventsCalendarProps) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<CalendarEvent['category'] | 'all'>('all');

  const filteredEvents = useMemo(
    () => (filterCategory === 'all' ? events : events.filter((e) => e.category === filterCategory)),
    [events, filterCategory]
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [viewMonth, viewYear]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  function formatDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={prevMonth} style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>‹</button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{MONTHS[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 16 }}>›</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['all', 'platform', 'milestone', 'release', 'marketing'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: filterCategory === cat ? (cat === 'all' ? '#1e293b' : categoryColors[cat]) : '#fff',
                color: filterCategory === cat ? '#fff' : '#475569',
              }}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94a3b8', padding: '4px 0' }}>{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = formatDate(viewYear, viewMonth, day);
          const dayEvents = eventsByDate[dateStr] || [];
          const isSelected = selectedDate === dateStr;
          const isToday = formatDate(today.getFullYear(), today.getMonth(), today.getDate()) === dateStr;

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                border: isSelected ? '2px solid #6366f1' : isToday ? '2px solid #f59e0b' : '1px solid #f1f5f9',
                borderRadius: 10,
                padding: '6px',
                minHeight: 80,
                cursor: 'pointer',
                background: isSelected ? '#eef2ff' : isToday ? '#fffbeb' : '#fff',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{day}</div>
              {dayEvents.slice(0, 3).map((ev) => (
                <div
                  key={ev.title}
                  title={ev.title}
                  style={{
                    fontSize: 10,
                    padding: '1px 4px',
                    borderRadius: 4,
                    background: categoryColors[ev.category] + '20',
                    color: categoryColors[ev.category],
                    marginBottom: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderLeft: `3px solid ${categoryColors[ev.category]}`,
                  }}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>+{dayEvents.length - 3} more</div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && selectedEvents.length > 0 && (
        <div style={{ background: '#f8fafc', borderRadius: 16, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>
            Events for {selectedDate}
          </h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {selectedEvents.map((ev) => (
              <div
                key={`${ev.date}-${ev.title}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 12,
                  alignItems: 'start',
                  padding: '12px 16px',
                  background: '#fff',
                  borderRadius: 12,
                  border: '1px solid #f1f5f9',
                }}
              >
                <div style={{ width: 4, height: '100%', borderRadius: 2, background: categoryColors[ev.category] }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{ev.description}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: categoryColors[ev.category] + '20', color: categoryColors[ev.category], fontWeight: 600 }}>{ev.category}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: impactColors[ev.impact] + '20', color: impactColors[ev.impact], fontWeight: 600 }}>{ev.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
