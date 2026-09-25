'use client';

import { SWRConfig } from 'swr';

/**
 * Global SWR configuration. SWR already pauses revalidation while the tab
 * is hidden (`revalidateOnFocus`/visibility handling built in), so no
 * extra wiring is needed for that requirement.
 */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ revalidateOnFocus: true }}>{children}</SWRConfig>;
}
