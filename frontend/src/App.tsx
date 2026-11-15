import { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { SettingsProvider, useSettings } from './hooks/useSettings';
import AnimatedBackground from './components/ui/AnimatedBackground';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import Top50 from './pages/Top50';
import PlanetDetails from './pages/PlanetDetails';
import Methodology from './pages/Methodology';
import Settings from './pages/Settings';
import { LayoutDashboard, Search, Trophy, BookOpen, Settings as SettingsIcon, Menu, X } from 'lucide-react';
import LogoText from './components/ui/LogoText';
import DataStatus from './components/ui/DataStatus';

function AppContent() {
  const location = useLocation();
  const { animations } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Дашборд', icon: LayoutDashboard },
    { path: '/catalog', label: 'Каталог', icon: Search },
    { path: '/top50', label: 'TOP-50', icon: Trophy },
    { path: '/methodology', label: 'Методология', icon: BookOpen },
    { path: '/settings', label: 'Настройки', icon: SettingsIcon },
  ];

  // При переходе на другую страницу закрываем меню (на телефоне) и возвращаемся наверх.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Пока меню открыто: Esc закрывает его, страница под ним не прокручивается.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex bg-slate-950 relative overflow-hidden transition-colors duration-300">
      
      {/* 1. Анимированный фон (туманности) */}
      <AnimatedBackground enabled={animations} />

      {/* 2. Точечные сетки по углам (на телефоне не нужны) */}
      <div 
        className="hidden md:block absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at top right, black 20%, transparent 70%)'
        }}
      ></div>
      <div 
        className="hidden md:block absolute bottom-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(circle at bottom right, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(circle at bottom right, black 20%, transparent 70%)'
        }}
      ></div>

      {/* Декоративные кольца */}
      <div className="hidden md:block absolute top-20 right-20 w-[600px] h-[600px] border border-white/5 rounded-full pointer-events-none -z-10"></div>
      <div className="hidden md:block absolute top-32 right-32 w-[500px] h-[500px] border border-white/5 rounded-full pointer-events-none -z-10"></div>

      {/* === ВЕРХНЯЯ ПАНЕЛЬ (только телефон и планшет) === */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-30 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-2xl border-b border-white/5">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="ExoScope" className="w-8 h-8 object-contain" />
          <LogoText />
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
          aria-expanded={menuOpen}
          className="p-2 -mr-2 rounded-lg text-slate-300 hover:bg-white/5 transition-colors"
        >
          <Menu size={24} />
        </button>
      </header>

      {/* Затемнение под выдвижным меню */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {/* === САЙДБАР (на широком экране закреплён, на телефоне выезжает слева) === */}
      <aside
        className={`w-72 max-w-[85vw] bg-slate-900/80 backdrop-blur-2xl border-r border-white/5 p-6 flex flex-col fixed top-0 left-0 h-full overflow-y-auto z-40 lg:z-20 transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="Закрыть меню"
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-white/5 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-8 lg:mb-12 flex items-center gap-3">
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
      <main className="flex-1 min-w-0 lg:ml-72 px-4 pb-6 pt-[4.5rem] sm:px-6 lg:p-8 relative z-10 flex flex-col min-h-screen">
        <div className="max-w-7xl mx-auto w-full min-w-0 flex-1">
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
        <footer className="mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 text-center relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <span className="font-semibold text-slate-400">ExoScope © 2026</span>
            <span className="hidden md:inline">•</span>
            <span>Все права защищены</span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
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
