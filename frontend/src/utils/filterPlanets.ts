import type { HZStatus, Planet } from '../types/planet';
import { byEsiDesc } from './sortPlanets';

export type SortKey = 'esi_desc' | 'esi_asc' | 'name' | 'radius' | 'year_desc';

export interface CatalogFilters {
  search: string;
  hz: HZStatus[];
  minEsi: number;
  radiusMin: string;
  radiusMax: string;
  tempMin: string;
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
  if (v === null) return false;
  return (lo === null || v >= lo) && (hi === null || v <= hi);
};

const nullsLast = (a: number | null, b: number | null, dir: 1 | -1): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
};

const collator = new Intl.Collator('en', { numeric: false, sensitivity: 'variant' });
const byName = (a: Planet, b: Planet) => collator.compare(a.name, b.name);

const COMPARATORS: Record<SortKey, (a: Planet, b: Planet) => number> = {
  esi_desc: byEsiDesc,
  esi_asc: (a, b) => a.esi - b.esi || byName(a, b),
  name: byName,
  radius: (a, b) => nullsLast(a.radius_earth, b.radius_earth, 1) || byName(a, b),
  year_desc: (a, b) => nullsLast(a.discovery_year, b.discovery_year, -1) || byName(a, b),
};

const sortedCache = new WeakMap<Planet[], Map<SortKey, Planet[]>>();

function getSorted(planets: Planet[], key: SortKey): Planet[] {
  let byKey = sortedCache.get(planets);
  if (!byKey) {
    byKey = new Map();
    sortedCache.set(planets, byKey);
  }
  let sorted = byKey.get(key);
  if (!sorted) {
    sorted = [...planets].sort(COMPARATORS[key]);
    byKey.set(key, sorted);
  }
  return sorted;
}

const searchIndex = new WeakMap<Planet, string>();
function haystack(p: Planet): string {
  let h = searchIndex.get(p);
  if (h === undefined) {
    h = `${p.name}\u0000${p.host_star}`.toLowerCase();
    searchIndex.set(p, h);
  }
  return h;
}

export function applyFilters(planets: Planet[], f: CatalogFilters, tempUnit: 'K' | 'C'): Planet[] {
  const q = f.search.trim().toLowerCase();
  const hz = new Set<HZStatus>(f.hz);
  const offset = tempUnit === 'C' ? 273.15 : 0;

  const rMin = parse(f.radiusMin);
  const rMax = parse(f.radiusMax);
  const tMinRaw = parse(f.tempMin);
  const tMaxRaw = parse(f.tempMax);
  const tMin = tMinRaw === null ? null : tMinRaw + offset;
  const tMax = tMaxRaw === null ? null : tMaxRaw + offset;
  const yMin = parse(f.yearMin);
  const yMax = parse(f.yearMax);

  const sorted = getSorted(planets, f.sort);

  const noFilters =
    !q && f.minEsi <= 0 && hz.size === 0 && rMin === null && rMax === null &&
    tMin === null && tMax === null && yMin === null && yMax === null;
  if (noFilters) return sorted;

  return sorted.filter(
    (p) =>
      (!q || haystack(p).includes(q)) &&
      p.esi >= f.minEsi &&
      (hz.size === 0 || hz.has(p.hz_status)) &&
      inRange(p.radius_earth, rMin, rMax) &&
      inRange(p.eq_temp_k, tMin, tMax) &&
      inRange(p.discovery_year, yMin, yMax),
  );
}
