'use client';

import { useState } from 'react';

interface SessionEvent {
  time: number; // seconds from start
  type: 'click' | 'navigate' | 'scroll' | 'input';
  description: string;
}

interface Session {
  id: string;
  user: string;
  start: string;
  duration: number; // seconds
  events: SessionEvent[];
}

const EVENT_COLORS: Record<SessionEvent['type'], string> = {
  click: '#3b82f6',
  navigate: '#8b5cf6',
  scroll: '#10b981',
  input: '#f59e0b',
};

interface Props {
  session: Session;
}

export default function SessionPlayer({ session }: Props) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);

  const pct = session.duration > 0 ? (current / session.duration) * 100 : 0;
  const activeEvents = session.events.filter((e) => e.time <= current);

  function fmt(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function togglePlay() {
    if (playing) { setPlaying(false); return; }
    setPlaying(true);
    const interval = setInterval(() => {
      setCurrent((prev) => {
        if (prev >= session.duration) { clearInterval(interval); setPlaying(false); return prev; }
        return prev + 1;
      });
    }, 100);
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontWeight: 700 }}>{session.user}</span>
        <span style={{ color: '#64748b', fontSize: 13 }}>{session.start}</span>
      </div>

      {/* Scrubber */}
      <div style={{ position: 'relative', height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: 8, cursor: 'pointer' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setCurrent(Math.round(((e.clientX - rect.left) / rect.width) * session.duration));
        }}
      >
        <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
        {session.events.map((ev) => (
          <div key={`${ev.time}-${ev.description}`} style={{
            position: 'absolute', top: -3, width: 12, height: 12, borderRadius: '50%',
            background: EVENT_COLORS[ev.type], border: '2px solid #fff',
            left: `calc(${(ev.time / session.duration) * 100}% - 6px)`,
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={togglePlay} style={{
          background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8,
          padding: '6px 16px', fontWeight: 700, cursor: 'pointer',
        }}>
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button type="button" onClick={() => { setCurrent(0); setPlaying(false); }} style={{
          background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
        }}>↺ Reset</button>
        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 13 }}>
          {fmt(current)} / {fmt(session.duration)}
        </span>
      </div>

      {/* Event timeline */}
      <div style={{ fontSize: 13, color: '#475569', marginBottom: 4, fontWeight: 600 }}>Event timeline</div>
      <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {session.events.map((ev) => {
          const active = ev.time <= current;
          return (
            <div key={`${ev.time}-${ev.description}`} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              borderRadius: 6, background: active ? '#f0f9ff' : '#f8fafc',
              opacity: active ? 1 : 0.45,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[ev.type], flexShrink: 0 }} />
              <span style={{ fontFamily: 'monospace', color: '#94a3b8', width: 36 }}>{fmt(ev.time)}</span>
              <span style={{ color: EVENT_COLORS[ev.type], fontWeight: 600, width: 60 }}>{ev.type}</span>
              <span>{ev.description}</span>
            </div>
          );
        })}
      </div>

      {/* User actions log */}
      <div style={{ marginTop: 12, fontSize: 13, color: '#475569', fontWeight: 600 }}>User actions log</div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#0f172a', color: '#94a3b8', borderRadius: 8, padding: 12, marginTop: 4, maxHeight: 100, overflowY: 'auto' }}>
        {activeEvents.length === 0
          ? <span style={{ color: '#475569' }}>No actions yet…</span>
          : activeEvents.map((ev) => (
            <div key={`log-${ev.time}-${ev.description}`}>
              <span style={{ color: '#38bdf8' }}>[{fmt(ev.time)}]</span>{' '}
              <span style={{ color: EVENT_COLORS[ev.type] }}>{ev.type.toUpperCase()}</span>{' '}
              {ev.description}
            </div>
          ))}
      </div>
    </div>
  );
}
