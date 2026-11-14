import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Divider from '../components/ui/Divider';
import { useSettings } from '../hooks/useSettings';
import { formatTemp } from '../utils/temperature';
import Planet3D from '../components/planets/Planet3D';
import { generateVisual } from '../utils/generateVisual';
import { usePlanets } from '../hooks/usePlanets';
import { byEsiDesc } from '../utils/sortPlanets';

export default function Top50() {
  const { tempUnit } = useSettings();
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);
  const { data: planets, isLoading, error } = usePlanets();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Загрузка рейтинга...</div>;
  }

  if (error || !planets) {
    return <div className="p-8 text-center text-red-400">Ошибка загрузки данных</div>;
  }

  const sortedPlanets = [...planets].sort(byEsiDesc);
  const top3 = sortedPlanets.slice(0, 3);
  const rest = sortedPlanets.slice(3, 50);
  const podium = [top3[1], top3[0], top3[2]];

  const toggle3D = (id: string) => {
    setExpandedPlanet(expandedPlanet === id ? null : id);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Заголовок */}
      <div className="mb-12 text-center">
        <Divider>
          <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Trophy className="text-amber-400" size={32} />
          </div>
        </Divider>
        
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">TOP-50</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Самые перспективные кандидаты для поиска жизни, отсортированные по
          индексу сходства с Землей (ESI)
        </p>
      </div>

      {/* ПОДИУМ */}
      <div className="flex justify-center items-end gap-4 mb-16 h-[520px]">
        {podium.map((planet, index) => {
          const place = index === 0 ? 2 : index === 1 ? 1 : 3;
          const isFirst = place === 1;
          const isSecond = place === 2;
          const heightClass = isFirst ? 'h-[480px]' : isSecond ? 'h-[420px]' : 'h-[380px]';
          const isExpanded = expandedPlanet === planet.id;

          return (
            <div
              key={planet.id}
              className={`relative flex flex-col w-full max-w-[280px] ${heightClass} rounded-t-2xl border-x border-t transition-all group ${
                isFirst 
                  ? 'podium-first bg-gradient-to-t from-amber-500/20 to-slate-900/80 border-amber-500/50 shadow-[0_-10px_40px_rgba(245,158,11,0.2)] z-10' 
                  : isSecond
                    ? 'podium-second bg-slate-800/80 border-slate-400/30'
                    : 'podium-third bg-slate-800/80 border-amber-700/30'
              }`}
            >
              {/* Кнопка глазика */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggle3D(planet.id);
                }}
                className="absolute top-3 right-3 z-40 p-2 bg-slate-950/50 hover:bg-slate-900 rounded-full border border-white/10 text-slate-300 backdrop-blur-sm transition-colors"
                title={isExpanded ? "Показать информацию" : "Показать 3D"}
              >
                {isExpanded ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

              {/* Медаль */}
              <div className={`absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-xl z-30 ${
                isFirst ? 'bg-amber-400 border-amber-200 text-slate-900' : 
                isSecond ? 'bg-slate-300 border-white text-slate-900' : 
                'bg-amber-700 border-amber-500 text-white'
              }`}>
                <span className="text-xl font-black">{place}</span>
              </div>

              {/* Контент */}
              <div className="flex-1 flex flex-col relative overflow-hidden rounded-t-2xl pt-16">
                {isExpanded ? (
                  <div className="absolute inset-0 z-20">
                    <Planet3D visual={planet.visual || generateVisual(planet)} mini />
                  </div>
                ) : (
                  <Link 
                    to={`/planet/${planet.id}`} 
                    className="flex-1 flex flex-col justify-end p-6 text-center relative z-10"
                  >
                    <div className="flex-1 flex flex-col justify-center">
                      <h3 className={`font-bold mb-1 group-hover:text-amber-400 transition-colors ${isFirst ? 'text-2xl text-white' : 'text-xl text-white'}`}>
                        {planet.name}
                      </h3>
                      <p className="text-sm text-slate-400 mb-4">{planet.host_star}</p>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">ESI</span>
                            <span className="font-mono font-bold text-emerald-400">{planet.esi.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-slate-950/50 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: `${planet.esi * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="bg-slate-950/30 p-2 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Радиус</p>
                            <p className="text-sm font-semibold text-white">{planet.radius_earth} R⊕</p>
                          </div>
                          <div className="bg-slate-950/30 p-2 rounded-lg">
                            <p className="text-[10px] text-slate-500 uppercase">Темп.</p>
                            <p className="text-sm font-semibold text-white">{formatTemp(planet.eq_temp_k, tempUnit)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-center items-center text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                      Подробнее <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* СПИСОК ОСТАЛЬНЫХ */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="p-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-2">
          <Trophy className="text-slate-400" size={20} />
          <h2 className="text-lg font-bold text-white">Остальные кандидаты</h2>
        </div>
        
        <div className="divide-y divide-slate-700/50">
          {rest.map((planet, index) => {
            const place = index + 4;
            return (
              <Link 
                key={planet.id} 
                to={`/planet/${planet.id}`}
                className="flex items-center gap-4 p-4 hover:bg-slate-800/80 transition-colors group"
              >
                <div className="w-8 text-center font-mono text-slate-500 font-bold group-hover:text-amber-400 transition-colors">
                  #{place}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-semibold group-hover:text-emerald-400 transition-colors">{planet.name}</h3>
                  <p className="text-xs text-slate-500">{planet.host_star}</p>
                </div>

                <div className="hidden md:block w-24 text-right">
                  <p className="text-xs text-slate-500 uppercase">Радиус</p>
                  <p className="text-sm text-slate-300">{planet.radius_earth} R⊕</p>
                </div>

                <div className="hidden md:block w-24 text-right">
                  <p className="text-xs text-slate-500 uppercase">Темп.</p>
                  <p className="text-sm text-slate-300">{formatTemp(planet.eq_temp_k, tempUnit)}</p>
                </div>

                <div className="w-24 text-right">
                  <p className="text-xs text-slate-500 uppercase">ESI</p>
                  <p className={`text-sm font-mono font-bold ${planet.esi >= 0.8 ? 'text-emerald-400' : planet.esi >= 0.6 ? 'text-amber-400' : 'text-red-400'}`}>
                    {planet.esi.toFixed(2)}
                  </p>
                </div>

                <ArrowRight size={18} className="text-slate-600 group-hover:text-emerald-400 transition-colors ml-2" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}