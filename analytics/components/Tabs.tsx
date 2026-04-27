'use client';

import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (id: string) => void;
}

export default function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  function select(id: string) {
    setActive(id);
    onChange?.(id);
  }

  const current = tabs.find((t) => t.id === active);

  return (
    <div>
      <div
        role="tablist"
        className="flex border-b border-gray-200 dark:border-gray-700"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && select(tab.id)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none',
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {current && (
        <div
          id={`tabpanel-${current.id}`}
          role="tabpanel"
          className="pt-4"
        >
          {current.content}
        </div>
      )}
    </div>
  );
}
