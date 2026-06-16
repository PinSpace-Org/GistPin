import { AsyncLocalStorage } from 'async_hooks';

export const correlationStore = new AsyncLocalStorage<{ id: string }>();

export function getCorrelationId(): string {
  return correlationStore.getStore()?.id ?? '-';
}
