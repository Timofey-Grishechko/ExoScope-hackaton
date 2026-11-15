import { RotateCcw } from 'lucide-react';
import type { HZStatus } from '../../types/planet';
import { useSettings } from '../../hooks/useSettings';
import { countActiveFilters, DEFAULT_FILTERS, type CatalogFilters, type SortKey } from '../../utils/filterPlanets';

interface Props {
  filters: CatalogFilters;
  onChange: (patch: Partial<CatalogFilters>) => void;
  onReset: () => void;
}

const HZ_OPTIONS: { key: HZStatus; label: string; active: string }[] = [
  { key: 'inside', label: 'В зоне', active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { key: 'too_hot', label: 'Горячие', active: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { key: 'too_cold', label: 'Холодные', active: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { key: 'unknown', label: 'Неизвестно', active: 'bg-slate-500/30 text-slate-300 border-slate-400/40' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'esi_desc', label: 'ESI: по убыванию' },
  { key: 'esi_asc', label: 'ESI: по возрастанию' },
  { key: 'name', label: 'Название: А–Я' },
  { key: 'radius', label: 'Радиус: по возрастанию' },
  { key: 'year_desc', label: 'Год открытия: сначала новые' },
];

const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors';
const labelCls = 'block text-sm font-medium text-slate-400 mb-2';

function RangeInputs({
  min,
  max,
  onMin,
  onMax,
  step,
}: {
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="number" inputMode="decimal" step={step} placeholder="от" value={min} onChange={(e) => onMin(e.target.value)} className={inputCls} />
      <input type="number" inputMode="decimal" step={step} placeholder="до" value={max} onChange={(e) => onMax(e.target.value)} className={inputCls} />
    </div>
  );
}

export default function PlanetFilters({ filters, onChange, onReset }: Props) {
  const { tempUnit } = useSettings();
  const active = countActiveFilters(filters);

  const toggleHz = (key: HZStatus) => {
    const next = filters.hz.includes(key) ? filters.hz.filter((k) => k !== key) : [...filters.hz, key];
    onChange({ hz: next });
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
      {/* Поиск */}
      <div>
        <label className={labelCls}>Поиск по названию или звезде</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Например, Kepler..."
          className={inputCls}
        />
      </div>

      {/* Статус зоны обитаемости */}
      <div>
        <label className={labelCls}>Зона обитаемости</label>
        <div className="flex flex-wrap gap-2">
          {HZ_OPTIONS.map((o) => {
            const on = filters.hz.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleHz(o.key)}
                aria-pressed={on}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  on ? o.active : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ESI */}
      <div>
        <label className={labelCls}>
          Минимальный ESI: <span className="text-emerald-400 font-bold">{filters.minEsi.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={filters.minEsi}
          onChange={(e) => onChange({ minEsi: parseFloat(e.target.value) })}
          className="w-full accent-emerald-500"
        />
      </div>

      {/* Радиус */}
      <div>
        <label className={labelCls}>Радиус, R⊕</label>
        <RangeInputs
          min={filters.radiusMin}
          max={filters.radiusMax}
          onMin={(v) => onChange({ radiusMin: v })}
          onMax={(v) => onChange({ radiusMax: v })}
          step="0.1"
        />
      </div>

      {/* Температура (в единицах из настроек) */}
      <div>
        <label className={labelCls}>Температура, {tempUnit === 'C' ? '°C' : 'K'}</label>
        <RangeInputs
          min={filters.tempMin}
          max={filters.tempMax}
          onMin={(v) => onChange({ tempMin: v })}
          onMax={(v) => onChange({ tempMax: v })}
          step="10"
        />
      </div>

      {/* Год открытия */}
      <div>
        <label className={labelCls}>Год открытия</label>
        <RangeInputs
          min={filters.yearMin}
          max={filters.yearMax}
          onMin={(v) => onChange({ yearMin: v })}
          onMax={(v) => onChange({ yearMax: v })}
          step="1"
        />
      </div>

      {/* Сортировка */}
      <div>
        <label className={labelCls}>Сортировка</label>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as SortKey })}
          className={inputCls}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {(active > 0 || filters.sort !== DEFAULT_FILTERS.sort) && (
        <button
          type="button"
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} /> Сбросить{active > 0 ? ` (${active})` : ''}
        </button>
      )}
    </div>
  );
}
