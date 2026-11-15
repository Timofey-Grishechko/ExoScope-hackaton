import { useSyncStatus } from '../../hooks/useSyncStatus';
import { formatDateTime, formatRelative, getDataState, type DataState } from '../../utils/syncStatus';

const VIEW: Record<DataState, { dot: string; title: string }> = {
  loading: { dot: 'bg-slate-500 animate-pulse', title: 'Проверка…' },
  offline: { dot: 'bg-red-500', title: 'Нет связи с сервером' },
  empty: { dot: 'bg-amber-500', title: 'Каталог ещё не загружен' },
  error: { dot: 'bg-amber-500', title: 'Ошибка синхронизации' },
  stale: { dot: 'bg-amber-500', title: 'Данные устарели' },
  fresh: { dot: 'bg-emerald-500 animate-pulse', title: 'Данные актуальны' },
};

export default function DataStatus() {
  const { data, isLoading, isError } = useSyncStatus();
  const state = getDataState(data, isLoading, isError);
  const { dot, title } = VIEW[state];
  const lastSuccess = data?.last_success_at ?? null;

  let detail: string | null = null;
  if (state === 'offline') {
    detail = 'Бэкенд не отвечает';
  } else if (state === 'empty') {
    detail = 'Запустите воркер синхронизации';
  } else if (lastSuccess) {
    detail = `Обновлено ${formatRelative(lastSuccess)}`;
  }

  return (
    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
      <p className="text-xs text-slate-500 mb-1">Статус данных</p>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`}></div>
        <p className="text-sm text-slate-300 font-medium">{title}</p>
      </div>
      {detail && (
        <p className="text-xs text-slate-400 mt-2" title={lastSuccess ? formatDateTime(lastSuccess) : undefined}>
          {detail}
        </p>
      )}
      {state === 'error' && data?.last_error && (
        <p className="text-xs text-amber-400/80 mt-1 line-clamp-2" title={data.last_error}>
          {data.last_error}
        </p>
      )}
      {data && state !== 'offline' && state !== 'loading' && (
        <p className="text-xs text-slate-500 mt-1">Планет в каталоге: {data.planets_total.toLocaleString('ru-RU')}</p>
      )}
    </div>
  );
}
