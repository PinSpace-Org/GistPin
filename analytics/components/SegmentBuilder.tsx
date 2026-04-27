'use client';

import { useMemo, useState } from 'react';

type ActivityLevel = 'Low' | 'Medium' | 'High';
type GistOp = '>' | '<' | '=';

export interface Condition {
  id: string;
  field: 'activity' | 'signupAfter' | 'signupBefore' | 'country' | 'gistCount' | 'lastActiveDays';
  activityLevel?: ActivityLevel;
  dateValue?: string;
  textValue?: string;
  numValue?: number;
  gistOp?: GistOp;
}

export interface Segment {
  id: string;
  name: string;
  conditions: Condition[];
  logic: 'AND' | 'OR';
}

// Mock user pool for segment size estimation
const MOCK_USERS = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  activity: (['Low', 'Medium', 'High'] as ActivityLevel[])[i % 3],
  signupDate: new Date(2024, (i * 3) % 12, (i % 28) + 1).toISOString().slice(0, 10),
  country: ['US', 'UK', 'DE', 'FR', 'CA', 'AU'][i % 6],
  gistCount: (i * 7) % 50,
  lastActiveDays: (i * 3) % 60,
}));

type MockUser = typeof MOCK_USERS[0];

function matchUser(user: MockUser, condition: Condition): boolean {
  switch (condition.field) {
    case 'activity':      return user.activity === condition.activityLevel;
    case 'signupAfter':   return condition.dateValue ? user.signupDate >= condition.dateValue : true;
    case 'signupBefore':  return condition.dateValue ? user.signupDate <= condition.dateValue : true;
    case 'country':       return condition.textValue ? user.country === condition.textValue : true;
    case 'gistCount': {
      const n = condition.numValue ?? 0;
      if (condition.gistOp === '>') return user.gistCount > n;
      if (condition.gistOp === '<') return user.gistCount < n;
      return user.gistCount === n;
    }
    case 'lastActiveDays': return condition.numValue !== undefined ? user.lastActiveDays <= condition.numValue : true;
    default: return true;
  }
}

export function estimateSize(conditions: Condition[], logic: 'AND' | 'OR'): number {
  if (conditions.length === 0) return MOCK_USERS.length;
  return MOCK_USERS.filter((u) =>
    logic === 'AND'
      ? conditions.every((c) => matchUser(u, c))
      : conditions.some((c) => matchUser(u, c)),
  ).length;
}

export function exportSegmentCsv(segment: Segment): void {
  const matched = MOCK_USERS.filter((u) =>
    segment.logic === 'AND'
      ? segment.conditions.every((c) => matchUser(u, c))
      : segment.conditions.some((c) => matchUser(u, c)),
  );
  const header = 'id,activity,signupDate,country,gistCount,lastActiveDays';
  const rows = matched.map((u) =>
    [u.id, u.activity, u.signupDate, u.country, u.gistCount, u.lastActiveDays].join(','),
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${segment.name.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function newCondition(): Condition {
  return { id: Math.random().toString(36).slice(2), field: 'activity', activityLevel: 'High' };
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <select
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        value={condition.field}
        onChange={(e) => onChange({ ...newCondition(), id: condition.id, field: e.target.value as Condition['field'] })}
      >
        <option value="activity">Activity Level</option>
        <option value="signupAfter">Signup After</option>
        <option value="signupBefore">Signup Before</option>
        <option value="country">Country</option>
        <option value="gistCount">Gist Count</option>
        <option value="lastActiveDays">Last Active (days)</option>
      </select>

      {condition.field === 'activity' && (
        <select
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          value={condition.activityLevel}
          onChange={(e) => onChange({ ...condition, activityLevel: e.target.value as ActivityLevel })}
        >
          {(['Low', 'Medium', 'High'] as ActivityLevel[]).map((l) => <option key={l}>{l}</option>)}
        </select>
      )}

      {(condition.field === 'signupAfter' || condition.field === 'signupBefore') && (
        <input
          type="date"
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          value={condition.dateValue ?? ''}
          onChange={(e) => onChange({ ...condition, dateValue: e.target.value })}
        />
      )}

      {condition.field === 'country' && (
        <select
          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          value={condition.textValue ?? 'US'}
          onChange={(e) => onChange({ ...condition, textValue: e.target.value })}
        >
          {['US', 'UK', 'DE', 'FR', 'CA', 'AU'].map((c) => <option key={c}>{c}</option>)}
        </select>
      )}

      {condition.field === 'gistCount' && (
        <>
          <select
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            value={condition.gistOp ?? '>'}
            onChange={(e) => onChange({ ...condition, gistOp: e.target.value as GistOp })}
          >
            <option value=">">{'>'}</option>
            <option value="<">{'<'}</option>
            <option value="=">{'='}</option>
          </select>
          <input
            type="number"
            min={0}
            className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            value={condition.numValue ?? 0}
            onChange={(e) => onChange({ ...condition, numValue: Number(e.target.value) })}
          />
        </>
      )}

      {condition.field === 'lastActiveDays' && (
        <input
          type="number"
          min={1}
          className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          value={condition.numValue ?? 30}
          onChange={(e) => onChange({ ...condition, numValue: Number(e.target.value) })}
          placeholder="days"
        />
      )}

      <button
        onClick={onRemove}
        className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Remove condition"
      >
        ✕
      </button>
    </div>
  );
}

interface SegmentBuilderProps {
  onSave?: (segment: Segment) => void;
}

export function SegmentBuilder({ onSave }: SegmentBuilderProps) {
  const [segment, setSegment] = useState<Segment>({
    id: 'new',
    name: 'New Segment',
    conditions: [],
    logic: 'AND',
  });
  const [saved, setSaved] = useState(false);

  const previewSize = useMemo(
    () => estimateSize(segment.conditions, segment.logic),
    [segment.conditions, segment.logic],
  );

  function updateCondition(id: string, updated: Condition) {
    setSegment((s) => ({ ...s, conditions: s.conditions.map((c) => (c.id === id ? updated : c)) }));
    setSaved(false);
  }

  function removeCondition(id: string) {
    setSegment((s) => ({ ...s, conditions: s.conditions.filter((c) => c.id !== id) }));
    setSaved(false);
  }

  function handleSave() {
    const finalSegment = { ...segment, id: segment.id === 'new' ? Math.random().toString(36).slice(2) : segment.id };
    setSaved(true);
    onSave?.(finalSegment);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={segment.name}
          onChange={(e) => { setSegment((s) => ({ ...s, name: e.target.value })); setSaved(false); }}
        />
        <select
          className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          value={segment.logic}
          onChange={(e) => { setSegment((s) => ({ ...s, logic: e.target.value as 'AND' | 'OR' })); setSaved(false); }}
        >
          <option value="AND">Match ALL (AND)</option>
          <option value="OR">Match ANY (OR)</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Preview: <strong className="text-indigo-600 dark:text-indigo-400">{previewSize}</strong> / {MOCK_USERS.length} users
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {segment.conditions.map((c) => (
          <ConditionRow
            key={c.id}
            condition={c}
            onChange={(updated) => updateCondition(c.id, updated)}
            onRemove={() => removeCondition(c.id)}
          />
        ))}
        {segment.conditions.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No conditions — matches all users.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSegment((s) => ({ ...s, conditions: [...s.conditions, newCondition()] })); setSaved(false); }}
          className="rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-950 transition-colors"
        >
          + Add Condition
        </button>
        <button
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {saved ? '✓ Saved' : 'Save Segment'}
        </button>
      </div>
    </div>
  );
}
