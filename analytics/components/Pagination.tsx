'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

const PAGE_SIZES = [10, 25, 50, 100];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZES,
}: PaginationProps) {
  const pages = getPageNumbers(page, totalPages);

  const btnBase =
    'inline-flex h-8 min-w-[2rem] items-center justify-center rounded px-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand';
  const btnActive = 'bg-brand text-white';
  const btnDefault =
    'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';
  const btnDisabled = 'opacity-40 cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(clamp(page - 1, 1, totalPages))}
          disabled={page === 1}
          className={`${btnBase} ${page === 1 ? btnDisabled : btnDefault}`}
          aria-label="Previous page"
        >
          ‹
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${btnBase} ${p === page ? btnActive : btnDefault}`}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(clamp(page + 1, 1, totalPages))}
          disabled={page === totalPages}
          className={`${btnBase} ${page === totalPages ? btnDisabled : btnDefault}`}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
