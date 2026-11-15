import { memo, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Planet } from '../../types/planet';
import { ChevronRight, CircleDot } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { formatTemp } from '../../utils/temperature';

interface Props {
  planets: Planet[];
}

const HZ_LABELS: Record<string, { text: string; color: string }> = {
  inside: { text: 'В зоне', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  too_hot: { text: 'Горячая', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  too_cold: { text: 'Холодная', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};
const HZ_UNKNOWN = { text: 'Неизвестно', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' };

const PlanetRow = memo(function PlanetRow({ p, tempUnit }: { p: Planet; tempUnit: 'K' | 'C' }) {
  const hz = HZ_LABELS[p.hz_status] ?? HZ_UNKNOWN;
  return (
    <tr data-id={p.id} className="hover:bg-slate-800/80 transition-colors cursor-pointer group">
      <td className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col items-start min-w-0">
          <span className="font-bold text-white text-sm sm:text-base break-words group-hover:text-emerald-400 transition-colors">{p.name}</span>
          <span className="text-xs text-slate-500 break-words">{p.host_star}</span>
          <span className={`md:hidden mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${hz.color}`}>
            <CircleDot size={9} />
            {hz.text}
          </span>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right whitespace-nowrap">
        <span className="font-mono text-slate-300">{p.radius_earth ?? '—'}</span>
        <span className="text-xs text-slate-500 ml-1">R⊕</span>
        <div className="sm:hidden font-mono text-[11px] text-slate-500">{formatTemp(p.eq_temp_k, tempUnit)}</div>
      </td>
      <td className="hidden sm:table-cell px-6 py-4 text-right">
        <span className="font-mono text-slate-300">{formatTemp(p.eq_temp_k, tempUnit)}</span>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
        <span className={`font-mono font-bold ${p.esi >= 0.8 ? 'text-emerald-400' : p.esi >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
          {p.esi.toFixed(2)}
        </span>
      </td>
      <td className="hidden md:table-cell px-6 py-4 text-center">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${hz.color}`}>
          <CircleDot size={10} />
          {hz.text}
        </span>
      </td>
      <td className="hidden sm:table-cell px-6 py-4 text-right">
        <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors inline" />
      </td>
    </tr>
  );
});

function PlanetTable({ planets }: Props) {
  const navigate = useNavigate();
  const { tempUnit } = useSettings();

  const onRowClick = useCallback(
    (e: MouseEvent<HTMLTableSectionElement>) => {
      const row = (e.target as HTMLElement).closest('tr[data-id]');
      const id = row?.getAttribute('data-id');
      if (id) navigate(`/planet/${id}`);
    },
    [navigate],
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-md shadow-xl">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950/80 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-3 sm:px-6 py-4 sm:py-5 font-semibold">Планета</th>
            <th className="px-3 sm:px-6 py-4 sm:py-5 font-semibold text-right">Радиус</th>
            <th className="hidden sm:table-cell px-6 py-5 font-semibold text-right">Темп.</th>
            <th className="px-3 sm:px-6 py-4 sm:py-5 font-semibold text-center">ESI</th>
            <th className="hidden md:table-cell px-6 py-5 font-semibold text-center">Зона</th>
            <th className="hidden sm:table-cell px-6 py-5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50" onClick={onRowClick}>
          {planets.map((p) => (
            <PlanetRow key={p.id} p={p} tempUnit={tempUnit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(PlanetTable);
