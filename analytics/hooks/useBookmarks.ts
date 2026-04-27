'use client';

import { useState, useCallback, useEffect } from 'react';
import { getBookmarks, saveBookmark, deleteBookmark, type Bookmark } from '@/lib/bookmarks';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const refresh = useCallback(() => setBookmarks(getBookmarks()), []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback((name: string, url: string) => {
    saveBookmark({ name, url });
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    deleteBookmark(id);
    refresh();
  }, [refresh]);

  return { bookmarks, add, remove, refresh };
}
