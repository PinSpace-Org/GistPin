'use client';

import { useState } from 'react';
import SessionPlayer from '@/components/SessionPlayer';

const SESSIONS = [
  {
    id: 's1', user: 'anon_7f3a', start: '2026-03-28 09:14:02', duration: 142,
    events: [
      { time: 3, type: 'navigate' as const, description: 'Visited /dashboard' },
      { time: 18, type: 'click' as const, description: 'Clicked "New Gist" button' },
      { time: 34, type: 'input' as const, description: 'Typed gist content (87 chars)' },
      { time: 52, type: 'click' as const, description: 'Clicked "Post" button' },
      { time: 71, type: 'navigate' as const, description: 'Navigated to /map' },
      { time: 95, type: 'scroll' as const, description: 'Scrolled map south' },
      { time: 120, type: 'click' as const, description: 'Opened gist #4821' },
    ],
  },
  {
    id: 's2', user: 'anon_2c9b', start: '2026-03-28 10:02:47', duration: 98,
    events: [
      { time: 5, type: 'navigate' as const, description: 'Visited /map' },
      { time: 22, type: 'scroll' as const, description: 'Scrolled map north' },
      { time: 40, type: 'click' as const, description: 'Opened gist #3917' },
      { time: 58, type: 'click' as const, description: 'Tipped 0.5 XLM' },
      { time: 80, type: 'navigate' as const, description: 'Navigated to /profile' },
    ],
  },
  {
    id: 's3', user: 'anon_e1d4', start: '2026-03-28 11:45:19', duration: 210,
    events: [
      { time: 2, type: 'navigate' as const, description: 'Visited /dashboard' },
      { time: 15, type: 'click' as const, description: 'Opened analytics panel' },
      { time: 44, type: 'scroll' as const, description: 'Scrolled charts section' },
      { time: 70, type: 'navigate' as const, description: 'Navigated to /sessions' },
      { time: 100, type: 'click' as const, description: 'Played session s1' },
      { time: 155, type: 'navigate' as const, description: 'Navigated to /map' },
      { time: 190, type: 'input' as const, description: 'Searched location "Brooklyn"' },
    ],
  },
];

export default function SessionsPage() {
  const [selected, setSelected] = useState(SESSIONS[0].id);
  const session = SESSIONS.find((s) => s.id === selected)!;

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 64px' }}>
      <div style={{
        background: 'linear-gradient(135deg,#ffffff 0%,#ede9fe 100%)',
        borderRadius: 28, padding: '28px 28px 24px',
        boxShadow: '0 18px 46px rgba(15,23,42,0.08)', marginBottom: 28,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', borderRadius: 999,
          padding: '6px 12px', background: '#7c3aed', color: '#fff',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>Session Replay</div>
        <h1 style={{ margin: '0 0 6px', fontSize: 34 }}>Session replay viewer</h1>
        <p style={{ margin: 0, color: '#475569', fontSize: 15 }}>
          Browse recorded sessions, scrub through the timeline, and inspect user actions.
        </p>
      </div>

      {/* Session list */}
      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        {SESSIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSelected(s.id)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: selected === s.id ? '#ede9fe' : '#fff',
            border: `2px solid ${selected === s.id ? '#7c3aed' : '#e2e8f0'}`,
            borderRadius: 12, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
          }}>
            <div>
              <span style={{ fontWeight: 700 }}>{s.user}</span>
              <span style={{ color: '#64748b', fontSize: 13, marginLeft: 12 }}>{s.start}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#64748b' }}>
              <span>{s.events.length} events</span>
              <span>{Math.floor(s.duration / 60)}m {s.duration % 60}s</span>
            </div>
          </button>
        ))}
      </div>

      <SessionPlayer session={session} />
    </main>
  );
}
