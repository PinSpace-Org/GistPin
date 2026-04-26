'use client';

type Orientation = 'horizontal' | 'vertical';
type Color = 'default' | 'light' | 'dark' | 'brand';
type Spacing = 'sm' | 'md' | 'lg';

interface DividerProps {
  orientation?: Orientation;
  label?: string;
  color?: Color;
  spacing?: Spacing;
  className?: string;
}

const colorClasses: Record<Color, string> = {
  default: 'border-gray-200 dark:border-gray-700',
  light: 'border-gray-100 dark:border-gray-800',
  dark: 'border-gray-400 dark:border-gray-500',
  brand: 'border-brand',
};

const spacingH: Record<Spacing, string> = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-8',
};

const spacingV: Record<Spacing, string> = {
  sm: 'mx-2',
  md: 'mx-4',
  lg: 'mx-8',
};

export default function Divider({
  orientation = 'horizontal',
  label,
  color = 'default',
  spacing = 'md',
  className = '',
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={`inline-block self-stretch border-l ${colorClasses[color]} ${spacingV[spacing]} ${className}`}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        className={`flex items-center gap-3 ${spacingH[spacing]} ${className}`}
      >
        <div className={`flex-1 border-t ${colorClasses[color]}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{label}</span>
        <div className={`flex-1 border-t ${colorClasses[color]}`} />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={`border-t ${colorClasses[color]} ${spacingH[spacing]} ${className}`}
    />
  );
}
