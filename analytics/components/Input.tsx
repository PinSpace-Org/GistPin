'use client';

import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

type InputType = 'text' | 'number' | 'email' | 'password' | 'date' | 'search';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  type?: InputType;
  label?: string;
  error?: string;
  hint?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { type = 'text', label, error, hint, leading, trailing, className = '', id, ...props },
  ref,
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leading && (
          <span className="absolute left-3 text-gray-400 pointer-events-none">{leading}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`w-full rounded-lg border px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 ${
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-gray-200 dark:border-gray-700'
          } ${leading ? 'pl-9' : ''} ${trailing ? 'pr-9' : ''} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3 text-gray-400 pointer-events-none">{trailing}</span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
});

export default Input;
