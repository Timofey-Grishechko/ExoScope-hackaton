import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import AnimatedBackground from './components/ui/AnimatedBackground';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import Top50 from './pages/Top50';
import PlanetDetails from './pages/PlanetDetails';
import Methodology from './pages/Methodology';
import Settings from './pages/Settings';
import { LayoutDashboard, Search, Trophy, BookOpen, Settings as SettingsIcon } from 'lucide-react';
import LogoText from './components/ui/LogoText';
import DataStatus from './components/ui/DataStatus';

function AppContent() {
  const location = useLocation();
  const { animations } = useSettings();

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/catalog', label: 'Каталог', icon: Search },
    { path: '/top50', label: 'TOP-50', icon: Trophy },
    { path: '/methodology', label: 'Методология', icon: BookOpen },
    { path: '/settings', label: 'Настройки', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 relative overflow-hidden transition-colors duration-300">
      
      {/* 1. Анимированный фон (туманности) */}
      <AnimatedBackground enabled={animations} />

      {/* 2. Точечные сетки по углам */}
      <div 
        className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)'
        }}
      ></div>
      <div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(circle at bottom right, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at bottom right, black 20%, transparent 70%)'
        }}
      ></div>

      {/* Декоративные кольца */}
      <div className="absolute top-20 right-20 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-32 right-32 w-[500px] h-[500px] border border-white/5 rounded-full pointer-events-none -z-10"></div>

      {/* === САЙДБАР === */}
      <aside className="w-72 bg-slate-900/80 backdrop-blur-2xl border-r border-white/5 p-6 flex flex-col fixed h-full z-20">
        <div className="mb-12 flex items-center gap-3">
          {/* Логотип-планета */}
          <img 
            src="/logo.png" 
            alt="ExoScope Logo" 
            className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" 
          />
          <div>
            {/* Заменили текст на компонент с Сатурном */}
            <LogoText />
            <p className="text-[10px] text-blue-400 uppercase tracking-widest font-semibold">Deep Space Analysis</p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <DataStatus />
        </div>
      </aside>

      {/* === ОСНОВНОЙ КОНТЕНТ === */}
      <main className="flex-1 ml-72 p-8 relative z-10 flex flex-col min-h-screen">
        <div className="max-w-7xl mx-auto w-full flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/top50" element={<Top50 />} />
            <Route path="/planet/:id" element={<PlanetDetails />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>

        {/* === ФУТЕР === */}
        <footer className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <span className="font-semibold text-slate-400">ExoScope © 2026</span>
            <span className="hidden md:inline">•</span>
            <span>Все права защищены</span>
          </div>
          
          <div className="flex items-center gap-6">
            <a 
              href="https://exoplanetarchive.ipac.caltech.edu/" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-blue-400 transition-colors"
            >
              Данные: NASA Exoplanet Archive
            </a>
            <span className="hidden md:inline">•</span>
            <span className="hover:text-blue-400 transition-colors cursor-pointer">
              TulaHack 2026
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}