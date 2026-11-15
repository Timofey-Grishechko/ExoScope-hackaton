import type { Planet } from '../types/planet';

// Сортировка по ESI от большего к меньшему; при равенстве — по имени.
// Порядок совпадает с серверным ORDER BY esi DESC NULLS LAST, name ASC.
export function byEsiDesc(a: Planet, b: Planet): number {
  const ea = a.esi ?? -Infinity;
  const eb = b.esi ?? -Infinity;
  if (eb !== ea) return eb - ea;
  return a.name.localeCompare(b.name);
}
