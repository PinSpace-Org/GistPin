'use client';

import { useState } from 'react';
import { useAnnotations } from '@/hooks/useAnnotations';

interface AnnotationPanelProps {
  chartId: string;
  labels: string[];
}

/** Annotation panel: add/edit/delete annotations for a chart, stored in localStorage. */
export default function AnnotationPanel({ chartId, labels }: AnnotationPanelProps) {
  const { annotations, add, edit, remove } = useAnnotations(chartId);
  const [date, setDate] = useState(labels[0] ?? '');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    add(date, text.trim());
    setText('');
  }

  function startEdit(id: string, currentText: string) {
    setEditingId(id);
    setEditText(currentText);
  }

  function commitEdit(id: string) {
    if (editText.trim()) edit(id, { text: editText.trim() });
    setEditingId(null);
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Annotations
      </p>

      {/* Add form */}
      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <select
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {labels.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add note…"
          className="flex-1 rounded border border-gray-200 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
        <button
          type="submit"
          className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          Add
        </button>
      </form>

      {/* List */}
      {annotations.length === 0 ? (
        <p className="text-xs text-gray-400">No annotations yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {annotations.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-xs">
              <span className="shrink-0 font-medium text-indigo-600 dark:text-indigo-400">{a.date}</span>
              {editingId === a.id ? (
                <>
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 rounded border border-gray-200 bg-white px-1.5 py-0.5 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    autoFocus
                  />
                  <button onClick={() => commitEdit(a.id)} className="text-green-600 hover:underline">save</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:underline">cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-gray-700 dark:text-gray-300">{a.text}</span>
                  <button onClick={() => startEdit(a.id, a.text)} className="text-gray-400 hover:text-indigo-600">edit</button>
                  <button onClick={() => remove(a.id)} className="text-gray-400 hover:text-red-500">✕</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
