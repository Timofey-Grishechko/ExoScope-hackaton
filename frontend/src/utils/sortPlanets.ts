import type { Planet } from '../types/planet';

const collator = new Intl.Collator('en');

export function byEsiDesc(a: Planet, b: Planet): number {
  const ea = a.esi ?? -Infinity;
  const eb = b.esi ?? -Infinity;
  if (eb !== ea) return eb - ea;
  return collator.compare(a.name, b.name);
}
