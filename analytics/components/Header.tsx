import Image from 'next/image';

interface HeaderLogoProps {
  expanded?: boolean;
}

export default function HeaderLogo({ expanded = true }: HeaderLogoProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-5 ${!expanded ? 'justify-center px-0' : ''}`}>
      <Image
        src="/logo.svg"
        alt="GistPin logo"
        width={28}
        height={28}
        sizes="28px"
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIiBmaWxsPSJub25lIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzYzNjZmMSIvPjwvc3ZnPg=="
        priority
      />
      {expanded && (
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          GistPin
        </span>
      )}
    </div>
  );
}
