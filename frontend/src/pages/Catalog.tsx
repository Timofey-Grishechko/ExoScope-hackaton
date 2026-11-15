import { useState, useMemo, useDeferredValue } from 'react';
import PlanetTable from '../components/planets/PlanetTable';
import PlanetFilters from '../components/planets/PlanetFilters';
import { SearchX, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { usePlanets } from '../hooks/usePlanets';
import { useSettings } from '../hooks/useSettings';
import { applyFilters, countActiveFilters, DEFAULT_FILTERS, type CatalogFilters } from '../utils/filterPlanets';

const PAGE_SIZE = 100;

export default function Catalog() {
  const { data: allPlanets, isLoading, error } = usePlanets();
  const { tempUnit } = useSettings();

  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (patch: Partial<CatalogFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setVisibleCount(PAGE_SIZE);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setVisibleCount(PAGE_SIZE);
  };

  const deferredFilters = useDeferredValue(filters);

  const filteredPlanets = useMemo(
    () => (allPlanets ? applyFilters(allPlanets, deferredFilters, tempUnit) : []),
    [allPlanets, deferredFilters, tempUnit],
  );
  const visiblePlanets = useMemo(() => filteredPlanets.slice(0, visibleCount), [filteredPlanets, visibleCount]);
  const isStale = deferredFilters !== filters;

  const activeCount = countActiveFilters(filters);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-400">Загрузка каталога...</div>;
  }

  if (error || !allPlanets) {
    return <div className="p-8 text-center text-red-400">Ошибка загрузки данных</div>;
  }

  return (
    <div className="p-0 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 tracking-tight">Каталог экзопланет</h1>
        <p className="text-slate-400 text-base sm:text-lg">Исследуйте базу данных и находите миры, похожие на Землю</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
        <div className="w-full lg:w-1/4 shrink-0">
          <div className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-3 mb-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-emerald-400" />
                Параметры поиска{activeCount > 0 ? ` (${activeCount})` : ''}
              </span>
              <ChevronDown size={18} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <div className="hidden lg:flex items-center gap-2 text-white font-semibold mb-4">
              <SlidersHorizontal size={18} className="text-emerald-400" />
              Параметры поиска
            </div>
            <div className={showFilters ? 'block' : 'hidden lg:block'}>
              <PlanetFilters filters={filters} onChange={updateFilters} onReset={resetFilters} />
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-4">
            <p className="text-slate-400">
              Найдено: <span className="text-emerald-400 font-bold text-lg">{filteredPlanets.length}</span> из {allPlanets.length}
            </p>
          </div>

          {filteredPlanets.length > 0 ? (
            <>
              <div className={isStale ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
                <PlanetTable planets={visiblePlanets} />
              </div>
              {visibleCount < filteredPlanets.length && (
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="mt-4 w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
                >
                  Показать ещё ({filteredPlanets.length - visibleCount})
                </button>
              )}
            </>
          ) : (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <SearchX size={48} className="text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Ничего не найдено</h3>
              <p className="text-slate-400 max-w-sm mb-6">Попробуйте изменить параметры поиска или сбросить фильтры.</p>
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
