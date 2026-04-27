'use client';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Status = 'online' | 'offline' | 'away' | 'busy';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: Size;
  status?: Status;
  alt?: string;
}

interface AvatarGroupProps {
  avatars: AvatarProps[];
  max?: number;
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const statusClasses: Record<Status, string> = {
  online: 'bg-green-400',
  offline: 'bg-gray-400',
  away: 'bg-yellow-400',
  busy: 'bg-red-400',
};

const statusSizeClasses: Record<Size, string> = {
  xs: 'h-1.5 w-1.5 border',
  sm: 'h-2 w-2 border',
  md: 'h-2.5 w-2.5 border-2',
  lg: 'h-3 w-3 border-2',
  xl: 'h-3.5 w-3.5 border-2',
};

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', status, alt }: AvatarProps) {
  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? name ?? 'Avatar'}
          className={`rounded-full object-cover ${sizeClasses[size]}`}
        />
      ) : (
        <div
          className={`inline-flex items-center justify-center rounded-full bg-brand/20 font-semibold text-brand ${sizeClasses[size]}`}
          aria-label={name ?? 'Avatar'}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-gray-900 ${statusClasses[status]} ${statusSizeClasses[size]}`}
        />
      )}
    </div>
  );
}

export function AvatarGroup({ avatars, max = 4 }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((a, i) => (
        <div key={i} className="ring-2 ring-white dark:ring-gray-900 rounded-full">
          <Avatar {...a} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 ring-2 ring-white text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:ring-gray-900 dark:text-gray-300">
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default Avatar;
