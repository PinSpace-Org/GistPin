'use client';

import { useEffect, useRef, useState } from 'react';

interface OnlineUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  x: number;
  y: number;
  viewing: string;
}

interface ActivityItem {
  id: string;
  user: string;
  action: string;
  time: string;
}

interface Annotation {
  id: string;
  user: string;
  text: string;
  chart: string;
  time: string;
}

const MOCK_NAMES = ['Alex', 'Sarah', 'Jordan', 'Morgan', 'Taylor'];
const MOCK_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
const MOCK_AVATARS = ['AX', 'SR', 'JD', 'MG', 'TY'];
const CHARTS = ['Revenue chart', 'Users data', 'Gist heatmap', 'Engagement graph', 'Location table'];
const ACTIONS = ['viewed', 'exported', 'annotated', 'filtered', 'shared'];

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function makeUsers(count: number): OnlineUser[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i}`,
    name: MOCK_NAMES[i],
    avatar: MOCK_AVATARS[i],
    color: MOCK_COLORS[i],
    x: randomBetween(10, 90),
    y: randomBetween(10, 90),
    viewing: CHARTS[i % CHARTS.length],
  }));
}

function makeActivity(users: OnlineUser[]): ActivityItem[] {
  return Array.from({ length: 8 }, (_, i) => {
    const user = users[i % users.length];
    const minsAgo = i * 2;
    return {
      id: `act-${i}`,
      user: user.name,
      action: `${ACTIONS[i % ACTIONS.length]} ${CHARTS[(i + 1) % CHARTS.length]}`,
      time: minsAgo === 0 ? 'just now' : `${minsAgo}m ago`,
    };
  });
}

export default function CollaborationPage() {
  const [users, setUsers] = useState<OnlineUser[]>(() => makeUsers(3));
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationChart, setAnnotationChart] = useState(CHARTS[0]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialise activity feed
  useEffect(() => {
    setActivity(makeActivity(users));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Simulate cursor movement
  useEffect(() => {
    const interval = setInterval(() => {
      setUsers((prev) =>
        prev.map((u) => ({
          ...u,
          x: Math.min(90, Math.max(10, u.x + randomBetween(-5, 5))),
          y: Math.min(90, Math.max(10, u.y + randomBetween(-5, 5))),
        })),
      );
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Simulate new activity items
  useEffect(() => {
    const interval = setInterval(() => {
      const user = users[Math.floor(Math.random() * users.length)];
      const newItem: ActivityItem = {
        id: Math.random().toString(36).slice(2),
        user: user.name,
        action: `${ACTIONS[Math.floor(Math.random() * ACTIONS.length)]} ${CHARTS[Math.floor(Math.random() * CHARTS.length)]}`,
        time: 'just now',
      };
      setActivity((prev) => [newItem, ...prev.slice(0, 9)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [users]);

  function addAnnotation() {
    if (!annotationText.trim()) return;
    const user = users[0];
    setAnnotations((prev) => [
      {
        id: Math.random().toString(36).slice(2),
        user: user.name,
        text: annotationText.trim(),
        chart: annotationChart,
        time: 'just now',
      },
      ...prev,
    ]);
    setAnnotationText('');
  }

  return (
    <div className="space-y-6">
      {/* Online users bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {users.length} users online now
            </span>
          </div>
          <div className="flex -space-x-2">
            {users.map((u) => (
              <div
                key={u.id}
                title={`${u.name} — viewing ${u.viewing}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white dark:border-gray-900"
                style={{ backgroundColor: u.color }}
              >
                {u.avatar}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 ml-2">
            {users.map((u) => (
              <span key={u.id} className="text-xs text-gray-500 dark:text-gray-400">
                <span style={{ color: u.color }} className="font-semibold">{u.name}</span> → {u.viewing}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cursor simulation area */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Live Cursors
          </h2>
          <div
            ref={containerRef}
            className="relative rounded-lg bg-gray-50 dark:bg-gray-800 overflow-hidden"
            style={{ height: 220 }}
          >
            {/* Grid lines for visual context */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            {users.map((u) => (
              <div
                key={u.id}
                className="absolute transition-all duration-1000 ease-in-out pointer-events-none"
                style={{ left: `${u.x}%`, top: `${u.y}%` }}
              >
                {/* Cursor SVG */}
                <svg width={16} height={20} viewBox="0 0 16 20" fill={u.color}>
                  <path d="M0 0 L0 16 L4 12 L7 19 L9 18 L6 11 L11 11 Z" />
                </svg>
                <span
                  className="absolute left-4 top-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
            Activity Feed
          </h2>
          <ul className="space-y-2 max-h-52 overflow-y-auto">
            {activity.map((item) => {
              const user = users.find((u) => u.name === item.user);
              return (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <div
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: user?.color ?? '#6b7280' }}
                  >
                    {user?.avatar ?? item.user[0]}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong style={{ color: user?.color }}>{item.user}</strong> {item.action}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-gray-400">{item.time}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Collaborative annotations */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Collaborative Annotations
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            value={annotationChart}
            onChange={(e) => setAnnotationChart(e.target.value)}
          >
            {CHARTS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input
            className="flex-1 min-w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            placeholder="Add annotation..."
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
          />
          <button
            onClick={addAnnotation}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Post
          </button>
        </div>
        {annotations.length === 0 ? (
          <p className="text-sm text-gray-400">No annotations yet. Be the first to comment!</p>
        ) : (
          <ul className="space-y-2">
            {annotations.map((a) => {
              const user = users.find((u) => u.name === a.user);
              return (
                <li key={a.id} className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
                  <div
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: user?.color ?? '#6b7280' }}
                  >
                    {user?.avatar ?? a.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold" style={{ color: user?.color }}>{a.user}</span>
                    <span className="text-xs text-gray-400 ml-1">on {a.chart}</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{a.text}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-400">{a.time}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
