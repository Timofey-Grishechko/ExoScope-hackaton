import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { RotateCcw, ZoomIn, Hand } from 'lucide-react';
import type { Planet } from '../../types/planet';
import { useSettings } from '../../hooks/useSettings';
import { formatTemp } from '../../utils/temperature';

interface Props {
  planets: Planet[];
}

// Домен храним в кельвинах; для °C меняются только подписи осей.
const MIN_X = 0;
const MAX_X = 4;
const MIN_Y = 0;
const MAX_Y = 600;
const MIN_X_RANGE = 0.2;
const MIN_Y_RANGE = 20;
const MARGIN = { top: 16, right: 24, bottom: 46, left: 58 };
const HZ = { x1: 0.5, x2: 1.8, y1: 200, y2: 320 };
const TICKS = 5;

// Размер точки зависит от ESI: 1.5–4 px (раньше было 5–10 px).
const MIN_R = 1.5;
const MAX_R = 4;

interface Point {
  planet: Planet;
  x: number; // радиус, R⊕
  y: number; // температура, K
  r: number;
  color: string;
}

interface View {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const colorOf = (esi: number) => (esi >= 0.8 ? '#2dd4bf' : esi >= 0.6 ? '#a78bfa' : '#fb7185');
const radiusOf = (esi: number) => MIN_R + Math.max(0, Math.min(1, esi)) * (MAX_R - MIN_R);

function niceTicks(min: number, max: number, count: number): number[] {
  const range = max - min;
  if (range <= 0) return [];
  const raw = range / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const frac = raw / pow;
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

// Сдвигает отрезок [a0, a1] внутрь [min, max], сохраняя его длину.
function clampAxis(a0: number, a1: number, min: number, max: number): [number, number] {
  const range = a1 - a0;
  if (range >= max - min) return [min, max];
  if (a0 < min) return [min, min + range];
  if (a1 > max) return [max - range, max];
  return [a0, a1];
}

function ScatterPlot({ planets }: Props) {
  const { tempUnit } = useSettings();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<View>({ x0: MIN_X, x1: MAX_X, y0: MIN_Y, y1: MAX_Y });
  const sizeRef = useRef({ w: 0, h: 0 });
  const hoverRef = useRef<Point | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: View } | null>(null);
  const rafRef = useRef(0);

  const [isZoomed, setIsZoomed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [tooltip, setTooltip] = useState<{ point: Point; x: number; y: number } | null>(null);

  // Данные готовим один раз. Сортировка по ESI по возрастанию: лучшие планеты рисуются
  // поверх остальных, а точки одного цвета идут подряд — это позволяет рисовать их одним path.
  const points = useMemo<Point[]>(
    () =>
      planets
        .filter(
          (p) =>
            p.radius_earth !== null && p.radius_earth > 0 && p.radius_earth <= MAX_X &&
            p.eq_temp_k !== null && p.eq_temp_k > 0 && p.eq_temp_k <= MAX_Y,
        )
        .map((p) => ({
          planet: p,
          x: p.radius_earth as number,
          y: p.eq_temp_k as number,
          r: radiusOf(p.esi),
          color: colorOf(p.esi),
        }))
        .sort((a, b) => a.planet.esi - b.planet.esi),
    [planets],
  );

  const getTransform = useCallback(() => {
    const { w, h } = sizeRef.current;
    const v = viewRef.current;
    const pw = Math.max(1, w - MARGIN.left - MARGIN.right);
    const ph = Math.max(1, h - MARGIN.top - MARGIN.bottom);
    return {
      pw,
      ph,
      sx: (x: number) => MARGIN.left + ((x - v.x0) / (v.x1 - v.x0)) * pw,
      sy: (y: number) => MARGIN.top + (1 - (y - v.y0) / (v.y1 - v.y0)) * ph,
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const { w, h } = sizeRef.current;
    if (!canvas || !w || !h) return;

    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(w * dpr);
    const bh = Math.round(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const v = viewRef.current;
    const { pw, ph, sx, sy } = getTransform();
    const offset = tempUnit === 'C' ? 273.15 : 0;

    // Сетка и подписи
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of niceTicks(v.x0, v.x1, TICKS)) {
      const x = Math.round(sx(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + ph);
      ctx.stroke();
      ctx.fillText(Number(t.toFixed(1)).toString(), x, MARGIN.top + ph + 8);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const t of niceTicks(v.y0 - offset, v.y1 - offset, TICKS)) {
      const y = Math.round(sy(t + offset)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(MARGIN.left, y);
      ctx.lineTo(MARGIN.left + pw, y);
      ctx.stroke();
      ctx.fillText(Math.round(t).toString(), MARGIN.left - 8, y);
    }
    ctx.setLineDash([]);

    // Подписи осей
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Радиус (R⊕)', MARGIN.left + pw / 2, h - 4);
    ctx.save();
    ctx.translate(14, MARGIN.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText(`Температура (${tempUnit === 'C' ? '°C' : 'K'})`, 0, 0);
    ctx.restore();

    // Всё остальное — только внутри области графика
    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, pw, ph);
    ctx.clip();

    // Зона обитаемости
    const hx = sx(HZ.x1);
    const hy = sy(HZ.y2);
    const hw = sx(HZ.x2) - hx;
    const hh = sy(HZ.y1) - hy;
    ctx.fillStyle = 'rgba(45, 212, 191, 0.05)';
    ctx.fillRect(hx, hy, hw, hh);
    ctx.strokeStyle = 'rgba(45, 212, 191, 0.2)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(hx, hy, hw, hh);
    ctx.setLineDash([]);

    // Точки: один path на цвет вместо тысяч отдельных элементов
    ctx.globalAlpha = 0.85;
    let current = '';
    for (const pt of points) {
      if (pt.x < v.x0 || pt.x > v.x1 || pt.y < v.y0 || pt.y > v.y1) continue;
      if (pt.color !== current) {
        if (current) ctx.fill();
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        current = pt.color;
      }
      const px = sx(pt.x);
      const py = sy(pt.y);
      ctx.moveTo(px + pt.r, py);
      ctx.arc(px, py, pt.r, 0, Math.PI * 2);
    }
    if (current) ctx.fill();
    ctx.globalAlpha = 1;

    // Подсветка точки под курсором
    const hovered = hoverRef.current;
    if (hovered) {
      ctx.beginPath();
      ctx.arc(sx(hovered.x), sy(hovered.y), hovered.r + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }, [points, tempUnit, getTransform]);

  // Перерисовка не чаще одного раза за кадр, как бы часто ни приходили события мыши.
  const schedule = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  }, [draw]);

  const syncZoomed = useCallback(() => {
    const v = viewRef.current;
    setIsZoomed(v.x0 !== MIN_X || v.x1 !== MAX_X || v.y0 !== MIN_Y || v.y1 !== MAX_Y);
  }, []);

  // Размер canvas следует за контейнером
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      sizeRef.current = { w: rect.width, h: rect.height };
      schedule();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [schedule]);

  useEffect(() => {
    schedule();
  }, [schedule]);

  // Важно сбрасывать rafRef: в StrictMode эффекты размонтируются и монтируются заново,
  // и без сброса schedule() считал бы, что кадр уже запланирован, и canvas не рисовался бы.
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

  // Зум колесом. Обработчик нативный и не passive: React-овский onWheel не даёт
  // отменить прокрутку страницы.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const { pw, ph } = getTransform();
      const fx = Math.max(0, Math.min(1, (e.clientX - rect.left - MARGIN.left) / pw));
      const fy = Math.max(0, Math.min(1, (e.clientY - rect.top - MARGIN.top) / ph));
      const scale = e.deltaY > 0 ? 1.15 : 1 / 1.15;

      const v = viewRef.current;
      const xr = v.x1 - v.x0;
      const yr = v.y1 - v.y0;
      const newXr = Math.min(MAX_X - MIN_X, Math.max(MIN_X_RANGE, xr * scale));
      const newYr = Math.min(MAX_Y - MIN_Y, Math.max(MIN_Y_RANGE, yr * scale));

      const xf = v.x0 + fx * xr;
      const yf = v.y0 + (1 - fy) * yr;
      const [x0, x1] = clampAxis(xf - fx * newXr, xf + (1 - fx) * newXr, MIN_X, MAX_X);
      const [y0, y1] = clampAxis(yf - (1 - fy) * newYr, yf + fy * newYr, MIN_Y, MAX_Y);

      viewRef.current = { x0, x1, y0, y1 };
      hoverRef.current = null;
      setTooltip(null);
      syncZoomed();
      schedule();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [getTransform, schedule, syncZoomed]);

  const hitTest = (cx: number, cy: number) => {
    const { sx, sy } = getTransform();
    const v = viewRef.current;
    // С конца: сверху лежат планеты с наибольшим ESI
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      if (pt.x < v.x0 || pt.x > v.x1 || pt.y < v.y0 || pt.y > v.y1) continue;
      const px = sx(pt.x);
      const py = sy(pt.y);
      const reach = pt.r + 3;
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= reach * reach) return { point: pt, x: px, y: py };
    }
    return null;
  };

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      view: { ...viewRef.current },
    };
    hoverRef.current = null;
    setTooltip(null);
    setIsPanning(true);
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const drag = dragRef.current;

    if (drag) {
      const { pw, ph } = getTransform();
      const xr = drag.view.x1 - drag.view.x0;
      const yr = drag.view.y1 - drag.view.y0;
      const dx = ((cx - drag.x) / pw) * xr;
      const dy = ((cy - drag.y) / ph) * yr;
      const [x0, x1] = clampAxis(drag.view.x0 - dx, drag.view.x1 - dx, MIN_X, MAX_X);
      const [y0, y1] = clampAxis(drag.view.y0 + dy, drag.view.y1 + dy, MIN_Y, MAX_Y);
      viewRef.current = { x0, x1, y0, y1 };
      syncZoomed();
      schedule();
      return;
    }

    const hit = hitTest(cx, cy);
    const next = hit ? hit.point : null;
    if (next !== hoverRef.current) {
      hoverRef.current = next;
      setTooltip(hit);
      schedule();
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    endDrag();
    if (hoverRef.current) {
      hoverRef.current = null;
      setTooltip(null);
      schedule();
    }
  };

  const resetZoom = () => {
    viewRef.current = { x0: MIN_X, x1: MAX_X, y0: MIN_Y, y1: MAX_Y };
    syncZoomed();
    schedule();
  };

  return (
    <div className="bg-[#0a1220]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl relative select-none">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Карта экзопланет</h2>
          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
            <ZoomIn size={14} /> Колесико: зум | <Hand size={14} /> ЛКМ: перемещение
          </p>
        </div>

        {isZoomed && (
          <button
            onClick={resetZoom}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-colors text-sm font-medium z-10"
          >
            <RotateCcw size={16} /> Сброс
          </button>
        )}
      </div>

      <div ref={containerRef} className="w-full h-[450px] overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className={`block w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={handleMouseLeave}
        />

        {tooltip && !isPanning && (
          <div
            className="absolute bg-[#0f172a] border border-white/10 p-4 rounded-lg shadow-2xl pointer-events-none z-50"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -125%)' }}
          >
            <p className="font-bold text-white text-lg mb-2">{tooltip.point.planet.name}</p>
            <p className="text-sm text-slate-300">
              Радиус: <span className="text-white font-mono">{tooltip.point.planet.radius_earth} R⊕</span>
            </p>
            <p className="text-sm text-slate-300">
              Темп.: <span className="text-white font-mono">{formatTemp(tooltip.point.planet.eq_temp_k, tempUnit)}</span>
            </p>
            <p className="text-sm font-bold mt-2" style={{ color: tooltip.point.color }}>
              ESI: {tooltip.point.planet.esi.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ScatterPlot);
