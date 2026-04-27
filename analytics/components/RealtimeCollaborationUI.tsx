'use client';

import { useState } from 'react';

interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: 'active' | 'idle';
  lastAction: string;
}

const MOCK_COLLABORATORS: Collaborator[] = [
  { id: '1', name: 'Amara Osei',    initials: 'AO', color: 'bg-purple-500', status: 'active', lastAction: 'Editing segment builder' },
  { id: '2', name: 'James Kolo',    initials: 'JK', color: 'bg-blue-500',   status: 'active', lastAction: 'Viewing dashboard' },
  { id: '3', name: 'Fatima Bello',  initials: 'FB', color: 'bg-green-500',  status: 'idle',   lastAction: 'Left 3 min ago' },
  { id: '4', name: 'David Nwosu',   initials: 'DN', color: 'bg-orange-500', status: 'idle',   lastAction: 'Left 12 min ago' },
];

interface Message {
  id: string;
  author: string;
  initials: string;
  color: string;
  text: string;
  time: string;
}

const MOCK_MESSAGES: Message[] = [
  { id: '1', author: 'Amara Osei',  initials: 'AO', color: 'bg-purple-500', text: 'Updated the date range filter to last 30 days', time: '2m ago' },
  { id: '2', author: 'James Kolo',  initials: 'JK', color: 'bg-blue-500',   text: 'Can we add a CSV export here?',                 time: '5m ago' },
  { id: '3', author: 'Fatima Bello',initials: 'FB', color: 'bg-green-500',  text: 'The funnel chart looks off on mobile',           time: '15m ago' },
];

export default function RealtimeCollaborationUI() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  function send() {
    const text = message.trim();
    if (!text) return;
    setMessages((prev) => [
      { id: String(Date.now()), author: 'You', initials: 'YO', color: 'bg-brand', text, time: 'just now' },
      ...prev,
    ]);
    setMessage('');
  }

  const active = MOCK_COLLABORATORS.filter((c) => c.status === 'active');
  const idle   = MOCK_COLLABORATORS.filter((c) => c.status === 'idle');

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Real-time Collaboration</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Active now <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">{active.length}</span>
          </p>
          <ul className="space-y-3">
            {active.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${c.color}`}>
                  {c.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{c.lastAction}</p>
                </div>
                <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
              </li>
            ))}
          </ul>

          {idle.length > 0 && (
            <>
              <p className="mb-3 mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">Away</p>
              <ul className="space-y-3">
                {idle.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 opacity-60">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${c.color}`}>
                      {c.initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.lastAction}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 lg:w-80">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Team chat</p>
        </div>

        <ul className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((m) => (
            <li key={m.id} className="flex gap-3">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${m.color}`}>
                {m.initials}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {m.author} <span className="font-normal text-gray-400">{m.time}</span>
                </p>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{m.text}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex gap-2 border-t border-gray-200 p-3 dark:border-gray-700">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Send a message…"
            className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            onClick={send}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
