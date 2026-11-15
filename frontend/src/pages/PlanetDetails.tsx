import { useParams, Link } from 'react-router-dom';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { ArrowLeft, Database, Star, Thermometer, Maximize, CircleDot, Activity, ShieldCheck } from 'lucide-react';
import Planet3D from '../components/planets/Planet3D';
import SystemOrbit from '../components/planets/SystemOrbit';
import { generateVisual } from '../utils/generateVisual';
import { useSettings } from '../hooks/useSettings';
import { formatTemp } from '../utils/temperature';
import { usePlanet } from '../hooks/usePlanets';
import type { HZStatus } from '../types/planet';

const BADGE_BASE = 'px-3 py-1 border rounded-full text-xs font-bold uppercase tracking-wider';

// Значения hz_status — те, что отдаёт бэкенд (inside, too_hot, ...), а не сокращения.
const HZ_BADGES: Record<HZStatus, { text: string; cls: string }> = {
  inside: { text: 'В зоне обитаемости', cls: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  partially_inside: { text: 'Частично в зоне', cls: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  outside: { text: 'Вне зоны', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  too_hot: { text: 'Горячая зона', cls: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  too_cold: { text: 'Холодная зона', cls: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  unknown: { text: 'Неизвестно', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

export default function PlanetDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: planet, isLoading, error } = usePlanet(id || '');
  const { tempUnit } = useSettings();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Загрузка планеты...</div>;
  }

  if (error || !planet) {
    return (
      <div className="p-8 text-center text-slate-400">
        <h2 className="text-2xl mb-4">Планета не найдена</h2>
        <Link to="/catalog" className="text-blue-400 hover:underline">Вернуться в каталог</Link>
      </div>
    );
  }

  const visual = planet.visual || generateVisual(planet);
  const chartData = [{ name: 'ESI', value: planet.esi * 100 }];
  
  const getHZBadge = (status: HZStatus) => {
    const badge = HZ_BADGES[status] ?? HZ_BADGES.unknown;
    return <span className={`${BADGE_BASE} ${badge.cls}`}>{badge.text}</span>;
  };

  return (
    <div className="p-0 sm:p-8 max-w-6xl mx-auto relative">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      
      <Link to="/catalog" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={20} /> Назад в каталог
      </Link>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="mb-3">{getHZBadge(planet.hz_status)}</div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 tracking-tight break-words">{planet.name}</h1>
          <p className="text-base sm:text-xl text-slate-400 flex items-center gap-2">
            <Star size={20} className="text-amber-400" /> Звезда: {planet.host_star}
          </p>
        </div>
        
        <div className="bg-[#0a1220]/60 border border-white/10 p-4 rounded-xl w-full md:w-64">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400 flex items-center gap-1"><Database size={14} /> Полнота данных</span>
            <span className="text-sm font-bold text-white">{planet.data_completeness}%</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full" 
              style={{ width: `${planet.data_completeness}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-[#0a1220]/60 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <Planet3D visual={visual} />
          </div>

          <div className="bg-[#0a1220]/60 p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center">
            <h3 className="text-lg font-bold text-white mb-2">Индекс сходства с Землей</h3>
            <div className="w-full h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" cy="50%" 
                  innerRadius="70%" outerRadius="100%" 
                  barSize={20} 
                  data={chartData} 
                  startAngle={180} endAngle={0}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    background={{ fill: '#1e293b' }}
                    dataKey="value"
                    cornerRadius={10}
                    fill="#38bdf8"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                <span className="text-5xl font-black text-cyan-400">{planet.esi.toFixed(2)}</span>
              </div>
            </div>
            <p className="text-center text-sm text-slate-400 mt-2">
              {planet.esi >= 0.8 ? 'Высокое сходство' : planet.esi >= 0.6 ? 'Среднее сходство' : 'Низкое сходство'}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0a1220]/60 p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="text-blue-400" /> Физические характеристики
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Maximize size={12} /> Радиус</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.radius_earth ?? '—'} <span className="text-sm font-normal text-slate-500">R⊕</span></p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CircleDot size={12} /> Масса</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.mass_earth ?? '—'} <span className="text-sm font-normal text-slate-500">M⊕</span></p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Thermometer size={12} /> Температура</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{formatTemp(planet.eq_temp_k, tempUnit)}</p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Год открытия</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.discovery_year ?? '—'}</p>
              </div>
            </div>
          </div>

          {/* Параметры звезды */}
          <div className="bg-[#0a1220]/60 p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Star className="text-amber-400" /> Параметры звезды
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Температура</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.star_temp_k ?? '—'} <span className="text-sm font-normal text-slate-500">K</span></p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Светимость</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.star_luminosity_log ? `10^${planet.star_luminosity_log.toFixed(2)}` : '—'}</p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Масса</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.star_mass_solar ?? '—'} <span className="text-sm font-normal text-slate-500">M☉</span></p>
              </div>
              <div className="bg-[#060b13]/50 p-4 rounded-xl border border-white/5">
                <p className="text-xs text-slate-500 mb-1">Спектральный класс</p>
                <p className="text-xl sm:text-2xl font-bold text-white break-words">{planet.star_spectral_type ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a1220]/60 p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="text-cyan-400" /> Сравнение с Землей
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm mb-1">
                  <span className="text-slate-400">Радиус</span>
                  <span className="text-white font-mono">{planet.radius_earth} R⊕ (Земля: 1.0)</span>
                </div>
                <div className="w-full bg-[#060b13] rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (planet.radius_earth || 0) * 50)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap justify-between gap-x-3 text-sm mb-1">
                  <span className="text-slate-400">Температура</span>
                  <span className="text-white font-mono">
                    {formatTemp(planet.eq_temp_k, tempUnit)} (Земля: {tempUnit === 'C' ? '15°C' : '288 K'})
                  </span>
                </div>
                <div className="w-full bg-[#060b13] rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((planet.eq_temp_k || 0) / 600) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <SystemOrbit planet={planet} />
        </div>
      </div>
    </div>
  );
}
