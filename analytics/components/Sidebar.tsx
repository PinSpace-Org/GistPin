'use client';

import { useEffect, useRef } from 'react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Mobile-first collapsible sidebar with swipe-to-close support.
 * On desktop it renders children inline; on mobile it slides in as a drawer.
 */
export default function Sidebar({ open, onClose, children }: SidebarProps) {
  const startXRef = useRef<number | null>(null);

  // Swipe-left to close
  useEffect(() => {
    if (!open) return;

    function onTouchStart(e: TouchEvent) {
      startXRef.current = e.touches[0].clientX;
    }

    function onTouchEnd(e: TouchEvent) {
      if (startXRef.current === null) return;
      const delta = startXRef.current - e.changedTouches[0].clientX;
      if (delta > 60) onClose();
      startXRef.current = null;
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [open, onClose]);

  // Lock body scroll when drawer is open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`sidebar-transition fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 lg:static lg:z-auto lg:block lg:translate-x-0 lg:border-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        {children}
      </aside>
    </>
  );
}
