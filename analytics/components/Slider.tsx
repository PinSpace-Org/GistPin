'use client';

import { useId } from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  marks?: boolean;
  vertical?: boolean;
  disabled?: boolean;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  marks = false,
  vertical = false,
  disabled = false,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;

  const markValues: number[] = [];
  if (marks) {
    for (let v = min; v <= max; v += step * Math.ceil((max - min) / (step * 5))) {
      markValues.push(v);
    }
    if (!markValues.includes(max)) markValues.push(max);
  }

  return (
    <div className={`flex ${vertical ? 'flex-col-reverse items-center gap-2' : 'flex-col gap-1'} w-full`}>
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          {label && <label htmlFor={id}>{label}</label>}
          {showValue && <span>{value}</span>}
        </div>
      )}
      <div className={`relative flex items-center ${vertical ? 'h-40 w-6 flex-col' : 'h-6 w-full'}`}>
        <div className={`absolute rounded-full bg-gray-200 dark:bg-gray-700 ${vertical ? 'w-1.5 h-full' : 'h-1.5 w-full'}`} />
        <div
          className={`absolute rounded-full bg-brand ${vertical ? 'w-1.5 bottom-0' : 'h-1.5 left-0'}`}
          style={vertical ? { height: `${pct}%` } : { width: `${pct}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className={[
            'absolute appearance-none bg-transparent cursor-pointer',
            'accent-brand focus:outline-none',
            vertical ? 'h-full w-6 writing-mode-vertical' : 'w-full h-6',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
          style={vertical ? { writingMode: 'vertical-lr', direction: 'rtl' } : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>
      {marks && markValues.length > 0 && (
        <div className={`flex ${vertical ? 'flex-col-reverse items-start' : 'justify-between'} text-xs text-gray-400`}>
          {markValues.map((m) => <span key={m}>{m}</span>)}
        </div>
      )}
    </div>
  );
}

interface RangeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function RangeSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
}: RangeSliderProps) {
  const [lo, hi] = value;
  const loId = useId();
  const hiId = useId();
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{label}</span>
          <span>{lo} – {hi}</span>
        </div>
      )}
      <div className="relative flex items-center h-6 w-full">
        <div className="absolute h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
        <div
          className="absolute h-1.5 rounded-full bg-brand"
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
        />
        <input
          id={loId}
          type="range"
          min={min}
          max={hi}
          step={step}
          value={lo}
          disabled={disabled}
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
          className="absolute w-full appearance-none bg-transparent accent-brand cursor-pointer disabled:opacity-50"
          aria-label={label ? `${label} lower bound` : 'Lower bound'}
        />
        <input
          id={hiId}
          type="range"
          min={lo}
          max={max}
          step={step}
          value={hi}
          disabled={disabled}
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
          className="absolute w-full appearance-none bg-transparent accent-brand cursor-pointer disabled:opacity-50"
          aria-label={label ? `${label} upper bound` : 'Upper bound'}
        />
      </div>
    </div>
  );
}

export default Slider;
