import { useSettings } from '../hooks/useSettings';
import { Moon, Sun, Sparkles, Monitor, Thermometer } from 'lucide-react';

export default function Settings() {
  const { theme, toggleTheme, animations, toggleAnimations, compact, toggleCompact, tempUnit, toggleTempUnit } = useSettings();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Настройки интерфейса</h1>
        <p className="text-lg text-slate-400">Персонализируйте ExoScope под свои предпочтения</p>
      </div>

      <div className="space-y-6">
        {/* Тема */}
        <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              {theme === 'dark' ? <Moon size={24} /> : <Sun size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Цветовая тема</h3>
              <p className="text-sm text-slate-400">Переключение между темным и светлым режимом</p>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              theme === 'dark' ? 'bg-slate-700' : 'bg-blue-500'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              theme === 'dark' ? 'translate-x-1' : 'translate-x-9'
            }`} />
          </button>
        </div>

        {/* Анимации */}
        <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Анимации фона</h3>
              <p className="text-sm text-slate-400">Включить или отключить декоративные эффекты</p>
            </div>
          </div>
          
          <button 
            onClick={toggleAnimations}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              animations ? 'bg-purple-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              animations ? 'translate-x-9' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Компактный режим */}
        <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
              <Monitor size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Компактный режим</h3>
              <p className="text-sm text-slate-400">Уменьшает отступы в таблицах для отображения большего количества данных</p>
            </div>
          </div>
          
          <button 
            onClick={toggleCompact}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              compact ? 'bg-teal-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              compact ? 'translate-x-9' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Единицы температуры */}
        <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <Thermometer size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Единицы температуры</h3>
              <p className="text-sm text-slate-400">Отображение в Кельвинах (K) или Цельсиях (°C)</p>
            </div>
          </div>
          
          <button 
            onClick={toggleTempUnit}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              tempUnit === 'C' ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
              tempUnit === 'C' ? 'translate-x-9' : 'translate-x-1'
            }`} />
          </button>
        </div>

      </div>
    </div>
  );
}