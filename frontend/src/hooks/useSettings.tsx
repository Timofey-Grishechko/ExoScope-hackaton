import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'dark' | 'light';
type TempUnit = 'K' | 'C';

interface SettingsContextType {
  theme: Theme;
  toggleTheme: () => void;
  animations: boolean;
  toggleAnimations: () => void;
  compact: boolean;
  toggleCompact: () => void;
  tempUnit: TempUnit;
  toggleTempUnit: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('exoscope-theme') as Theme) || 'dark';
  });

  const [animations, setAnimations] = useState(() => {
    const saved = localStorage.getItem('exoscope-animations');
    if (saved !== null) return saved !== 'false';
    const lowPower =
      window.matchMedia?.('(pointer: coarse)').matches ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return !lowPower;
  });

  const [compact, setCompact] = useState(() => {
    return localStorage.getItem('exoscope-compact') === 'true';
  });

  const [tempUnit, setTempUnit] = useState<TempUnit>(() => {
    return (localStorage.getItem('exoscope-temp') as TempUnit) || 'K';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('exoscope-theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (compact) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    localStorage.setItem('exoscope-compact', String(compact));
  }, [compact]);

  useEffect(() => {
    localStorage.setItem('exoscope-temp', tempUnit);
  }, [tempUnit]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleAnimations = () =>
    setAnimations((prev) => {
      localStorage.setItem('exoscope-animations', String(!prev));
      return !prev;
    });
  const toggleCompact = () => setCompact(prev => !prev);
  const toggleTempUnit = () => setTempUnit(prev => prev === 'K' ? 'C' : 'K');

  return (
    <SettingsContext.Provider value={{
      theme, toggleTheme,
      animations, toggleAnimations,
      compact, toggleCompact,
      tempUnit, toggleTempUnit
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}