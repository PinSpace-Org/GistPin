'use client';

import { ReactNode, useState } from 'react';

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  multiple?: boolean;
  defaultOpen?: string[];
}

export default function Accordion({ items, multiple = false, defaultOpen = [] }: AccordionProps) {
  const [open, setOpen] = useState<Set<string>>(new Set(defaultOpen));

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!multiple) next.clear();
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
      {items.map((item) => {
        const isOpen = open.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              disabled={item.disabled}
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
              onClick={() => !item.disabled && toggle(item.id)}
              className={[
                'flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-left transition-colors',
                'text-gray-800 dark:text-gray-200',
                isOpen ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30',
                item.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {item.title}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            <div
              id={`accordion-panel-${item.id}`}
              role="region"
              hidden={!isOpen}
              className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
