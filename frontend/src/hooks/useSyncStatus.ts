import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { SyncStatus } from '../types/planet';

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const { data } = await api.get<SyncStatus>('/status');
      return data;
    },
    refetchInterval: 1000 * 60, // раз в минуту: статус должен отражать реальное состояние
    staleTime: 1000 * 30,
  });
}
