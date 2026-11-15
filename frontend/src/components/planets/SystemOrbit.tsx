import { Orbit } from 'lucide-react';
import type { HZStatus, Planet } from '../../types/planet';

interface Props {
  planet: Planet;
}

// Схема в логарифмической шкале: орбиты в каталоге NASA лежат от ~0.01 до сотен а.е.,
// в линейной шкале почти все планеты слились бы у самой звезды.
const SIZE = 320;
const C = SIZE / 2;
const R_STAR = 7;
const R_INNER = 16; // радиус, соответствующий AU_MIN
const R_OUTER = 148; // радиус, соответствующий AU_MAX
const AU_MIN = 0.01;
const AU_MAX = 100;
const LOG_MIN = Math.log10(AU_MIN);
const LOG_MAX = Math.log10(AU_MAX);

// Опорные орбиты для масштаба
const REFERENCE_AU = [0.1, 1, 10];

const toRadius = (au: number): number => {
  const clamped = Math.min(AU_MAX, Math.max(AU_MIN, au));
  const t = (Math.log10(clamped) - LOG_MIN) / (LOG_MAX - LOG_MIN);
  return R_INNER + t * (R_OUTER - R_INNER);
};

// Светимость в светимостях Солнца: из каталога, а если её нет — из облучённости (S = L / a²).
function luminosity(p: Planet): number | null {
  if (p.star_luminosity_log !== null) return Math.pow(10, p.star_luminosity_log);
  if (p.insolation && p.semi_major_axis_au) return p.insolation * p.semi_major_axis_au ** 2;
  return null;
}

// Консервативная оценка границ обитаемой зоны (потоки Kopparapu и др.: 1.1 и 0.36 от солнечного).
// Это оценка по светимости, она не равна статусу hz_status, который считается по температуре планеты.
const hzBounds = (lum: number): [number, number] => [Math.sqrt(lum / 1.1), Math.sqrt(lum / 0.36)];

const fmtAu = (au: number): string => (au >= 10 ? au.toFixed(1) : au >= 0.1 ? au.toFixed(2) : au.toFixed(3));

// Стабильный угол по id: планета не прыгает при каждом открытии, а разные планеты стоят по-разному.
function angleFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967296) * Math.PI * 2;
}

const dotColor = (status: HZStatus) =>
  status === 'inside' || status === 'partially_inside' ? '#2dd4bf' : status === 'too_hot' ? '#fb7185' : '#818cf8';

export default function SystemOrbit({ planet }: Props) {
  const au = planet.semi_major_axis_au;
  const lum = luminosity(planet);
  const hz = lum !== null ? hzBounds(lum) : null;

  let hzBand: { r: number; width: number } | null = null;
  if (hz) {
    const rIn = toRadius(hz[0]);
    const rOut = toRadius(hz[1]);
    hzBand = { r: (rIn + rOut) / 2, width: Math.max(2, rOut - rIn) };
  }

  const orbitR = au ? toRadius(au) : null;
  const angle = angleFor(planet.id);
  const px = orbitR !== null ? C + Math.cos(angle) * orbitR : 0;
  const py = orbitR !== null ? C + Math.sin(angle) * orbitR : 0;

  return (
    <div className="bg-[#0a1220]/60 p-4 sm:p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Orbit className="text-cyan-400" /> Положение в системе
      </h3>

      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[340px] mx-auto block" role="img"
        aria-label={`Орбита планеты ${planet.name} вокруг звезды ${planet.host_star}`}>
        {/* Обитаемая зона */}
        {hzBand && (
          <circle cx={C} cy={C} r={hzBand.r} fill="none" stroke="#2dd4bf" strokeOpacity={0.14} strokeWidth={hzBand.width} />
        )}

        {/* Опорные орбиты: 0.1, 1 и 10 а.е. */}
        {REFERENCE_AU.map((ref) => {
          const r = toRadius(ref);
          return (
            <g key={ref}>
              <circle cx={C} cy={C} r={r} fill="none" stroke="#475569" strokeOpacity={0.45} strokeDasharray="3 4" />
              <text x={C} y={C - r - 3} textAnchor="middle" fontSize="9" fill="#64748b">
                {ref} а.е.
              </text>
            </g>
          );
        })}

        {/* Орбита планеты */}
        {orbitR !== null && (
          <circle cx={C} cy={C} r={orbitR} fill="none" stroke={dotColor(planet.hz_status)} strokeOpacity={0.7} strokeWidth={1.5} />
        )}

        {/* Звезда */}
        <circle cx={C} cy={C} r={R_STAR + 6} fill="#fbbf24" fillOpacity={0.15} />
        <circle cx={C} cy={C} r={R_STAR} fill="#fbbf24" />

        {/* Планета */}
        {orbitR !== null && (
          <circle cx={px} cy={py} r={5} fill={dotColor(planet.hz_status)} stroke="#0a1220" strokeWidth={1.5} />
        )}
      </svg>

      <div className="text-center text-sm mt-4 space-y-1">
        {au ? (
          <p className="text-slate-300">
            Большая полуось: <span className="font-mono text-white">{fmtAu(au)} а.е.</span>
          </p>
        ) : (
          <p className="text-slate-500">Нет данных о большой полуоси — орбита не показана</p>
        )}
        {hz ? (
          <p className="text-slate-400">
            Обитаемая зона звезды (оценка): <span className="font-mono text-teal-300">{fmtAu(hz[0])}–{fmtAu(hz[1])} а.е.</span>
          </p>
        ) : (
          <p className="text-slate-500">Светимость звезды неизвестна — обитаемая зона не показана</p>
        )}
        <p className="text-xs text-slate-500">Логарифмическая шкала расстояний</p>
      </div>
    </div>
  );
}
