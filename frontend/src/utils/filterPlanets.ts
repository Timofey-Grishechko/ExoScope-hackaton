import type { HZStatus, Planet } from '../types/planet';
import { byEsiDesc } from './sortPlanets';

export type SortKey = 'esi_desc' | 'esi_asc' | 'name' | 'radius' | 'year_desc';

export interface CatalogFilters {
  search: string;
  hz: HZStatus[]; // пусто = любой статус
  minEsi: number;
  // Числовые поля хранятся строками, чтобы поле ввода можно было очистить (пусто = без ограничения).
  radiusMin: string;
  radiusMax: string;
  tempMin: string; // в единицах из настроек (K или °C)
  tempMax: string;
  yearMin: string;
  yearMax: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  search: '',
  hz: [],
  minEsi: 0,
  radiusMin: '',
  radiusMax: '',
  tempMin: '',
  tempMax: '',
  yearMin: '',
  yearMax: '',
  sort: 'esi_desc',
};

const parse = (s: string): number | null => {
  if (s.trim() === '') return null;
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

// Количество включённых фильтров (сортировка не считается).
export function countActiveFilters(f: CatalogFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.hz.length > 0) n++;
  if (f.minEsi > 0) n++;
  if (f.radiusMin.trim() || f.radiusMax.trim()) n++;
  if (f.tempMin.trim() || f.tempMax.trim()) n++;
  if (f.yearMin.trim() || f.yearMax.trim()) n++;
  return n;
}

const inRange = (v: number | null, lo: number | null, hi: number | null): boolean => {
  if (lo === null && hi === null) return true;
  if (v === null) return false; // граница задана, а значения у планеты нет
  return (lo === null || v >= lo) && (hi === null || v <= hi);
};

// null всегда в конце списка
const nullsLast = (a: number | null, b: number | null, dir: 1 | -1): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
};

const COMPARATORS: Record<SortKey, (a: Planet, b: Planet) => number> = {
  esi_desc: byEsiDesc,
  esi_asc: (a, b) => a.esi - b.esi || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  radius: (a, b) => nullsLast(a.radius_earth, b.radius_earth, 1) || a.name.localeCompare(b.name),
  year_desc: (a, b) => nullsLast(a.discovery_year, b.discovery_year, -1) || a.name.localeCompare(b.name),
};

export function applyFilters(planets: Planet[], f: CatalogFilters, tempUnit: 'K' | 'C'): Planet[] {
  const q = f.search.trim().toLowerCase();
  const hz = new Set<HZStatus>(f.hz);
  const offset = tempUnit === 'C' ? 273.15 : 0; // температура планет хранится в кельвинах

  const rMin = parse(f.radiusMin);
  const rMax = parse(f.radiusMax);
  const tMinRaw = parse(f.tempMin);
  const tMaxRaw = parse(f.tempMax);
  const tMin = tMinRaw === null ? null : tMinRaw + offset;
  const tMax = tMaxRaw === null ? null : tMaxRaw + offset;
  const yMin = parse(f.yearMin);
  const yMax = parse(f.yearMax);

  return planets
    .filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.host_star.toLowerCase().includes(q)) &&
        p.esi >= f.minEsi &&
        (hz.size === 0 || hz.has(p.hz_status)) &&
        inRange(p.radius_earth, rMin, rMax) &&
        inRange(p.eq_temp_k, tMin, tMax) &&
        inRange(p.discovery_year, yMin, yMax),
    )
    .sort(COMPARATORS[f.sort]);
}
