'use client';

import { useId } from 'react';

type Size = 'sm' | 'md' | 'lg';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  labelPosition?: 'left' | 'right';
  size?: Size;
  disabled?: boolean;
}

const trackSize: Record<Size, string> = {
  sm: 'h-4 w-7',
  md: 'h-5 w-9',
  lg: 'h-6 w-11',
};

const thumbSize: Record<Size, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

const thumbTranslate: Record<Size, string> = {
  sm: 'translate-x-3.5',
  md: 'translate-x-4.5',
  lg: 'translate-x-5.5',
};

const labelSize: Record<Size, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export default function Switch({
  checked,
  onChange,
  label,
  labelPosition = 'right',
  size = 'md',
  disabled = false,
}: SwitchProps) {
  const id = useId();

  const track = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2',
        trackSize[size],
        checked ? 'bg-brand' : 'bg-gray-300 dark:bg-gray-600',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block rounded-full bg-white shadow transition-transform duration-200',
          thumbSize[size],
          checked ? thumbTranslate[size] : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );

  if (!label) return track;

  return (
    <label
      htmlFor={id}
      className={[
        'inline-flex items-center gap-2 select-none',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        labelSize[size],
        'text-gray-700 dark:text-gray-300',
      ].join(' ')}
    >
      {labelPosition === 'left' && <span>{label}</span>}
      {track}
      {labelPosition === 'right' && <span>{label}</span>}
    </label>
  );
}
