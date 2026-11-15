import type { SyncStatus } from '../types/planet';

const STALE_AFTER_MS = 8 * 24 * 60 * 60 * 1000;

export type DataState = 'loading' | 'offline' | 'empty' | 'error' | 'stale' | 'fresh';

export function getDataState(
  status: SyncStatus | undefined,
  isLoading: boolean,
  isError: boolean,
  now = Date.now(),
): DataState {
  if (isLoading) return 'loading';
  if (isError || !status) return 'offline';
  if (!status.last_success_at) return status.last_error ? 'error' : 'empty';
  if (status.last_error) return 'error';
  const age = now - new Date(status.last_success_at).getTime();
  return age > STALE_AFTER_MS ? 'stale' : 'fresh';
}

const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' });

export function formatRelative(iso: string, now = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return 'только что';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86400), 'day');
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
