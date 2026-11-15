import { useState } from 'react';
import { Calculator, Target, ShieldAlert, ChevronDown, ChevronUp, Database, Activity } from 'lucide-react';

export default function Methodology() {
  const [openSection, setOpenSection] = useState<string | null>('esi');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className="p-8 w-full max-w-6xl mx-auto">
      {/* Хедер */}
      <div className="mb-12 text-center relative w-full">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 mb-4 pb-2 tracking-tight">
          Научная методология
        </h1>
        <p className="text-xl text-slate-400 mx-auto leading-relaxed w-full">
          Как алгоритмы ExoScope превращают сырые данные телескопов в рейтинг самых перспективных миров для жизни
        </p>
      </div>

      {/* Основные блоки */}
      <div className="space-y-6 w-full">
        
        {/* Блок 1: ESI */}
        <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden transition-all">
          <button 
            onClick={() => toggleSection('esi')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                <Calculator size={24} />
              </div>
              <div className="text-left w-full">
                <h2 className="text-xl font-bold text-white">Индекс сходства с Землей (ESI)</h2>
                <p className="text-sm text-slate-400">Математическая оценка физического сходства</p>
              </div>
            </div>
            {openSection === 'esi' ? <ChevronUp className="text-slate-400 shrink-0" /> : <ChevronDown className="text-slate-400 shrink-0" />}
          </button>

          {openSection === 'esi' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-700/50 w-full">
              <p className="text-slate-300 mb-6 leading-relaxed w-full">
                ESI (Earth Similarity Index) — это научный показатель, разработанный для оценки того, насколько планета похожа на Землю по физическим параметрам. Значение от 0 до 1, где 1 — это точная копия Земли.
              </p>
              
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 relative overflow-hidden group mb-6 w-full">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">Расчетная формула (2 параметра)</p>
                <div className="font-mono text-lg text-emerald-300 mb-6 break-all">
                  ESI = √[ (1 - |(R - R₀) / (R + R₀)|) × (1 - |(T - T₀) / (T + T₀)|) ]
                </div>
                
                <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest font-bold">Общая формула (n параметров)</p>
                <div className="font-mono text-base text-emerald-300 break-all">
                  ESI = ( ∏ (1 - |(xᵢ - xᵢ₀) / (xᵢ + xᵢ₀)|) )^(1/n)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 w-full">
                  <p className="text-emerald-400 font-bold mb-1">R и R₀</p>
                  <p className="text-sm text-slate-400 w-full">Радиус планеты и радиус Земли (1.0 R⊕).</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 w-full">
                  <p className="text-emerald-400 font-bold mb-1">T и T₀</p>
                  <p className="text-sm text-slate-400 w-full">Температура планеты и температура Земли (288 K).</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 w-full">
                  <p className="text-emerald-400 font-bold mb-1">Диапазон</p>
                  <p className="text-sm text-slate-400 w-full">От 0 (нет сходства) до 1 (полная копия).</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Блок 2: Зона обитаемости */}
        <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden transition-all">
          <button 
            onClick={() => toggleSection('hz')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 shrink-0">
                <Target size={24} />
              </div>
              <div className="text-left w-full">
                <h2 className="text-xl font-bold text-white">Зона обитаемости (Habitable Zone)</h2>
                <p className="text-sm text-slate-400">Область, где возможна жидкая вода</p>
              </div>
            </div>
            {openSection === 'hz' ? <ChevronUp className="text-slate-400 shrink-0" /> : <ChevronDown className="text-slate-400 shrink-0" />}
          </button>

          {openSection === 'hz' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-700/50 w-full">
              <p className="text-slate-300 mb-6 leading-relaxed w-full">
                Зона обитаемости — это область вокруг звезды, где на поверхности планеты может существовать жидкая вода. Мы определяем её по светимости звезды и расстоянию до планеты.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-stretch">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-xl w-full h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></div>
                    <h3 className="font-bold text-emerald-400">В зоне</h3>
                  </div>
                  <p className="text-sm text-slate-300 w-full flex-1">Температура от 200 до 320 K. Радиус до 1.8 R⊕.</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 p-5 rounded-xl w-full h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 shrink-0"></div>
                    <h3 className="font-bold text-red-400">Горячая</h3>
                  </div>
                  <p className="text-sm text-slate-300 w-full flex-1">Температура выше 320 K. Как Венера.</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-xl w-full h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                    <h3 className="font-bold text-blue-400">Холодная</h3>
                  </div>
                  <p className="text-sm text-slate-300 w-full flex-1">Температура ниже 200 K. Как Марс.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Блок 3: Данные */}
        <div className="w-full bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden transition-all">
          <button 
            onClick={() => toggleSection('data')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-700/30 transition-colors"
          >
            <div className="flex items-center gap-4 w-full">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                <Database size={24} />
              </div>
              <div className="text-left w-full">
                <h2 className="text-xl font-bold text-white">Источник данных</h2>
                <p className="text-sm text-slate-400">Откуда мы берем информацию</p>
              </div>
            </div>
            {openSection === 'data' ? <ChevronUp className="text-slate-400 shrink-0" /> : <ChevronDown className="text-slate-400 shrink-0" />}
          </button>

          {openSection === 'data' && (
            <div className="px-6 pb-6 pt-2 border-t border-slate-700/50 w-full">
              <p className="text-slate-300 leading-relaxed mb-4 w-full">
                Мы используем открытые данные из <a href="https://exoplanetarchive.ipac.caltech.edu/" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">NASA Exoplanet Archive</a>. Это наиболее полная и актуальная база данных об экзопланетах, которая обновляется по мере публикаций научных работ.
              </p>
              <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700 w-full">
                <Activity className="text-purple-400 shrink-0" size={20} />
                <p className="text-sm text-slate-400 w-full">
                  База содержит более <strong className="text-white">5000</strong> подтвержденных экзопланет. Мы обрабатываем и визуализируем только те, у которых есть достаточно данных для расчета.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Блок 4: Ограничения */}
        <div className="w-full bg-amber-500/5 backdrop-blur-md rounded-2xl border border-amber-500/20 overflow-hidden">
          <div className="p-6 w-full">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                <ShieldAlert size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Важные ограничения</h2>
            </div>
            <p className="text-slate-300 leading-relaxed w-full">
              Наш индекс — это <strong className="text-white">оценка сходства</strong>, а не гарантия наличия жизни. Мы не учитываем наличие атмосферы, магнитного поля и химический состав. Для принятия окончательного вывода необходимы данные спектрального анализа.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}