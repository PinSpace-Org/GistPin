'use client';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'brand' | 'white' | 'gray';

interface SpinnerProps {
  size?: Size;
  variant?: Variant;
  label?: string;
  fullscreen?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

const colorClasses: Record<Variant, string> = {
  brand: 'border-brand/20 border-t-brand',
  white: 'border-white/20 border-t-white',
  gray: 'border-gray-200 border-t-gray-500 dark:border-gray-700 dark:border-t-gray-300',
};

export default function Spinner({
  size = 'md',
  variant = 'brand',
  label,
  fullscreen = false,
}: SpinnerProps) {
  const spinner = (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[variant]}`}
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
        {spinner}
      </div>
    );
  }

  return spinner;
}
