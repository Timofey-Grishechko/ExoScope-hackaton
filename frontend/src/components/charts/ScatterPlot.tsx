import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { RotateCcw, ZoomIn, Hand, Plus, Minus } from 'lucide-react';
import type { Planet } from '../../types/planet';
import { useSettings } from '../../hooks/useSettings';
import { formatTemp } from '../../utils/temperature';

interface Props {
  planets: Planet[];
}

const MIN_X = 0;
const MAX_X = 4;
const MIN_Y = 0;
const MAX_Y = 600;
const MIN_X_RANGE = 0.2;
const MIN_Y_RANGE = 20;
const MARGIN = { top: 16, right: 24, bottom: 46, left: 58 };
const HZ = { x1: 0.5, x2: 1.8, y1: 200, y2: 320 };
const TICKS = 5;

const MIN_R = 1.5;
const MAX_R = 4;

interface Point {
  planet: Planet;
  x: number;
  y: number;
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

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Радиус (R⊕)', MARGIN.left + pw / 2, h - 4);
    ctx.save();
    ctx.translate(14, MARGIN.top + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText(`Температура (${tempUnit === 'C' ? '°C' : 'K'})`, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(MARGIN.left, MARGIN.top, pw, ph);
    ctx.clip();

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

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    },
    [],
  );

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

  const hitTest = useCallback((cx: number, cy: number, slop = 3) => {
    const { sx, sy } = getTransform();
    const v = viewRef.current;
    for (let i = points.length - 1; i >= 0; i--) {
      const pt = points[i];
      if (pt.x < v.x0 || pt.x > v.x1 || pt.y < v.y0 || pt.y > v.y1) continue;
      const px = sx(pt.x);
      const py = sy(pt.y);
      const reach = pt.r + slop;
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= reach * reach) return { point: pt, x: px, y: py };
    }
    return null;
  }, [points, getTransform]);

  const zoomBy = (scale: number) => {
    const v = viewRef.current;
    const xr = v.x1 - v.x0;
    const yr = v.y1 - v.y0;
    const newXr = Math.min(MAX_X - MIN_X, Math.max(MIN_X_RANGE, xr * scale));
    const newYr = Math.min(MAX_Y - MIN_Y, Math.max(MIN_Y_RANGE, yr * scale));
    const cx = v.x0 + xr / 2;
    const cy = v.y0 + yr / 2;
    const [x0, x1] = clampAxis(cx - newXr / 2, cx + newXr / 2, MIN_X, MAX_X);
    const [y0, y1] = clampAxis(cy - newYr / 2, cy + newYr / 2, MIN_Y, MAX_Y);
    viewRef.current = { x0, x1, y0, y1 };
    hoverRef.current = null;
    setTooltip(null);
    syncZoomed();
    schedule();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pos = (t: Touch) => {
      const rect = canvas.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };
    const isFull = () => {
      const v = viewRef.current;
      return v.x0 === MIN_X && v.x1 === MAX_X && v.y0 === MIN_Y && v.y1 === MAX_Y;
    };
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

    let pinch: { dist: number; cx: number; cy: number; view: View } | null = null;
    let pan: { x: number; y: number; view: View } | null = null;
    let tap: { x: number; y: number } | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        const a = pos(e.touches[0]);
        const b = pos(e.touches[1]);
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
          view: { ...viewRef.current },
        };
        pan = null;
        tap = null;
        hoverRef.current = null;
        setTooltip(null);
        schedule();
      } else if (e.touches.length === 1) {
        const a = pos(e.touches[0]);
        tap = { x: a.x, y: a.y };
        pan = isFull() ? null : { x: a.x, y: a.y, view: { ...viewRef.current } };
        pinch = null;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (pinch && e.touches.length >= 2) {
        if (e.cancelable) e.preventDefault();
        const a = pos(e.touches[0]);
        const b = pos(e.touches[1]);
        const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        const { pw, ph } = getTransform();
        const v0 = pinch.view;
        const xr0 = v0.x1 - v0.x0;
        const yr0 = v0.y1 - v0.y0;
        const scale = pinch.dist / dist;
        const newXr = Math.min(MAX_X - MIN_X, Math.max(MIN_X_RANGE, xr0 * scale));
        const newYr = Math.min(MAX_Y - MIN_Y, Math.max(MIN_Y_RANGE, yr0 * scale));
        const xf = v0.x0 + clamp01((pinch.cx - MARGIN.left) / pw) * xr0;
        const yf = v0.y0 + (1 - clamp01((pinch.cy - MARGIN.top) / ph)) * yr0;
        const fx1 = clamp01((cx - MARGIN.left) / pw);
        const fy1 = clamp01((cy - MARGIN.top) / ph);
        const [x0, x1] = clampAxis(xf - fx1 * newXr, xf + (1 - fx1) * newXr, MIN_X, MAX_X);
        const [y0, y1] = clampAxis(yf - (1 - fy1) * newYr, yf + fy1 * newYr, MIN_Y, MAX_Y);
        viewRef.current = { x0, x1, y0, y1 };
        syncZoomed();
        schedule();
        return;
      }

      if (e.touches.length === 1) {
        const a = pos(e.touches[0]);
        if (tap && Math.hypot(a.x - tap.x, a.y - tap.y) > 10) tap = null;
        if (pan) {
          if (e.cancelable) e.preventDefault();
          const { pw, ph } = getTransform();
          const xr = pan.view.x1 - pan.view.x0;
          const yr = pan.view.y1 - pan.view.y0;
          const dx = ((a.x - pan.x) / pw) * xr;
          const dy = ((a.y - pan.y) / ph) * yr;
          const [x0, x1] = clampAxis(pan.view.x0 - dx, pan.view.x1 - dx, MIN_X, MAX_X);
          const [y0, y1] = clampAxis(pan.view.y0 + dy, pan.view.y1 + dy, MIN_Y, MAX_Y);
          viewRef.current = { x0, x1, y0, y1 };
          syncZoomed();
          schedule();
        }
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
      if (e.touches.length === 0) {
        if (tap && e.changedTouches.length === 1) {
          if (e.cancelable) e.preventDefault();
          const hit = hitTest(tap.x, tap.y, 14);
          hoverRef.current = hit ? hit.point : null;
          setTooltip(hit);
          schedule();
        }
        tap = null;
        pan = null;
      }
    };

    const onCancel = () => {
      pinch = null;
      pan = null;
      tap = null;
    };

    canvas.addEventListener('touchstart', onStart, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onCancel);
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onCancel);
    };
  }, [getTransform, hitTest, schedule, syncZoomed]);

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
    <div className="bg-[#0a1220]/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl relative select-none">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Карта экзопланет</h2>
          <p className="text-sm text-slate-400 mt-1 hidden md:flex items-center gap-2">
            <ZoomIn size={14} /> Колесико: зум | <Hand size={14} /> ЛКМ: перемещение
          </p>
          <p className="text-xs text-slate-400 mt-1 md:hidden">
            Нажмите на точку, чтобы увидеть планету. Зум: кнопки +/- или щипок двумя пальцами.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.6)}
            aria-label="Приблизить"
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-colors z-10"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.6)}
            aria-label="Отдалить"
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-colors z-10"
          >
            <Minus size={16} />
          </button>
          {isZoomed && (
            <button
              onClick={resetZoom}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-colors text-sm font-medium z-10"
            >
              <RotateCcw size={16} /> Сброс
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="w-full h-[360px] sm:h-[450px] overflow-hidden relative">
        <canvas
          ref={canvasRef}
          className={`block w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={handleMouseLeave}
          style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
        />

        {tooltip && !isPanning && (
          <div
            className="absolute bg-[#0f172a] border border-white/10 p-3 sm:p-4 rounded-lg shadow-2xl pointer-events-none z-50 w-max max-w-[200px]"
            style={{
              left: Math.min(Math.max(tooltip.x, 100), Math.max(100, sizeRef.current.w - 100)),
              top: tooltip.y,
              transform: tooltip.y < 130 ? 'translate(-50%, 16px)' : 'translate(-50%, -125%)',
            }}
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
