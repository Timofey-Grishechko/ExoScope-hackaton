import ScatterPlot from '../components/charts/ScatterPlot';
import { Globe, ShieldCheck, Star, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePlanets } from '../hooks/usePlanets';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { formatDateTime } from '../utils/syncStatus';

export default function Dashboard() {
  const { data: planets, isLoading, error } = usePlanets();
  const { data: sync } = useSyncStatus();

  // Заглушки для загрузки и ошибки
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <div className="text-slate-400 text-lg">Загрузка данных...</div>
      </div>
    );
  }

  if (error || !planets) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <div className="text-red-400 text-lg">Ошибка загрузки данных. Проверьте соединение с сервером.</div>
      </div>
    );
  }

  // Статистика
  const totalPlanets = planets.length;
  const habitableCount = planets.filter(p => p.hz_status === 'inside').length;
  const bestEsi = planets.length > 0 ? Math.max(...planets.map(p => p.esi)) : 0;

  // Данные для круговой диаграммы
  const hzData = [
    { name: 'В зоне обитаемости', value: planets.filter(p => p.hz_status === 'inside').length, color: '#38bdf8' },
    { name: 'Горячие', value: planets.filter(p => p.hz_status === 'too_hot').length, color: '#fb7185' },
    { name: 'Холодные', value: planets.filter(p => p.hz_status === 'too_cold').length, color: '#818cf8' },
  ];

  // Данные для графика по годам
  const yearCounts: Record<string, number> = {};
  planets.forEach(p => {
    if (p.discovery_year) {
      yearCounts[p.discovery_year] = (yearCounts[p.discovery_year] || 0) + 1;
    }
  });
  const barData = Object.keys(yearCounts).map(year => ({
    year: year,
    count: yearCounts[year]
  })).sort((a, b) => Number(a.year) - Number(b.year));

  const stats = [
    { label: 'Всего планет', value: totalPlanets, icon: Globe, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'В зоне обитаемости', value: habitableCount, icon: ShieldCheck, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Лучший ESI', value: bestEsi.toFixed(2), icon: Star, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { label: 'Типов звезд', value: new Set(planets.map(p => p.host_star)).size, icon: Activity, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  ];

  return (
    <div>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Обзор данных</h1>
          <p className="text-lg text-slate-400">Аналитика распределения экзопланет по ключевым параметрам</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm text-slate-500">Последнее обновление</p>
          <p className="text-blue-400 font-mono text-sm">
            {sync?.last_success_at ? formatDateTime(sync.last_success_at) : '—'}
          </p>
        </div>
      </div>

      {/* 4 карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className={`bg-[#0a1220]/60 p-5 rounded-2xl border ${stat.border} flex items-center gap-4 shadow-lg backdrop-blur-sm`}>
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-black text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Основная сетка */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левый большой график */}
        <div className="lg:col-span-2">
          <ScatterPlot planets={planets} />
        </div>

        {/* Правая колонка */}
        <div className="flex flex-col gap-6 h-full">
          
          {/* Круговая диаграмма */}
          <div className="bg-[#0a1220]/60 p-6 rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-lg font-bold text-white mb-2">Распределение по зонам</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hzData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {hzData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0a1220', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#38bdf8]"></div>В зоне</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#fb7185]"></div>Горячие</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#818cf8]"></div>Холодные</div>
            </div>
          </div>

          {/* График по годам */}
          <div className="bg-[#0a1220]/60 p-6 rounded-2xl border border-white/5 shadow-xl backdrop-blur-sm flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-lg font-bold text-white mb-4">Открытия по годам</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}