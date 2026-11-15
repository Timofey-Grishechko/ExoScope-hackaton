import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Planet } from '../types/planet';

// Каталог NASA — около 6500 планет. Дашборд, каталог и TOP-50 работают с полным
// списком на клиенте, поэтому запрашиваем его целиком (сервер сжимает ответ gzip).
const ALL_PLANETS_LIMIT = 10000;

export function usePlanets() {
  return useQuery({
    queryKey: ['planets'],
    queryFn: async () => {
      const { data } = await api.get<Planet[]>('/planets', {
        params: { limit: ALL_PLANETS_LIMIT },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 минут кэша
  });
}

export function usePlanet(id: string) {
  return useQuery({
    queryKey: ['planet', id],
    queryFn: async () => {
      const { data } = await api.get<Planet>(`/planets/${encodeURIComponent(id)}`);
      return data;
    },
    enabled: !!id,
  });
}
