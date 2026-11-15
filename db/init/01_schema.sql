-- ============================================================================
-- ExoScope: согласованная схема PostgreSQL под Go-приложение (pgx.CopyFrom).
--
-- Таблицы:
--   planets     — одна строка = одна экзопланета (научные параметры + visual JSONB);
--   stars       — справочник родительских звёзд;
--   sync_state  — состояние синхронизации с NASA.
--
-- ESI, habitability_index, hz_status и data_completeness рассчитывает Go-бэкенд:
-- в БД нет SQL-функций и генерируемых столбцов для этих значений, они только
-- хранятся и валидируются CHECK-ограничениями.
--
-- Идентификаторы строк — TEXT (id, name, host_star), чтобы совпадать с текущим
-- storage-кодом Go; planets.id — первичный ключ, planets.name — UNIQUE.
--
-- Файл рассчитан на пустую БД (docker-entrypoint-initdb.d). Используется
-- CREATE TABLE IF NOT EXISTS, поэтому повторный запуск не обновит существующую
-- структуру: изменения схемы оформляйте отдельными ALTER-миграциями.
-- ============================================================================

BEGIN;

-- =========================================================
-- 1. EXTENSIONS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- =========================================================
-- 2. PLANETS
-- Одна запись = одна экзопланета
-- =========================================================

CREATE TABLE IF NOT EXISTS public.planets (
    id TEXT PRIMARY KEY,

    -- Идентификация
    name TEXT NOT NULL UNIQUE CHECK (name <> ''),
    host_star TEXT NOT NULL CHECK (host_star <> ''),

    -- Физические параметры планеты
    radius_earth DOUBLE PRECISION
        CHECK (radius_earth > 0),

    mass_earth DOUBLE PRECISION
        CHECK (mass_earth > 0),

    density DOUBLE PRECISION
        CHECK (density > 0),

    eq_temp_k DOUBLE PRECISION
        CHECK (eq_temp_k > 0),

    insolation DOUBLE PRECISION
        CHECK (insolation >= 0),

    -- Орбитальные параметры
    semi_major_axis_au DOUBLE PRECISION
        CHECK (semi_major_axis_au > 0),

    orbital_period_days DOUBLE PRECISION
        CHECK (orbital_period_days > 0),

    eccentricity DOUBLE PRECISION
        CHECK (eccentricity BETWEEN 0 AND 1),

    inclination_deg DOUBLE PRECISION
        CHECK (inclination_deg BETWEEN 0 AND 180),

    argument_periastron_deg DOUBLE PRECISION,

    periastron_time_jd DOUBLE PRECISION,

    -- Параметры родительской звезды
    star_temp_k DOUBLE PRECISION
        CHECK (star_temp_k > 0),

    star_radius_solar DOUBLE PRECISION
        CHECK (star_radius_solar > 0),

    star_mass_solar DOUBLE PRECISION
        CHECK (star_mass_solar > 0),

    star_luminosity_log DOUBLE PRECISION,

    star_spectral_type TEXT,

    -- Открытие
    discovery_year SMALLINT,

    discovery_method TEXT,

    -- Расчётные показатели ExoScope (считает Go-бэкенд)
    esi DOUBLE PRECISION
        CHECK (esi BETWEEN 0 AND 1),

    habitability_index INTEGER
        CHECK (habitability_index BETWEEN 0 AND 100),

    hz_status TEXT NOT NULL DEFAULT 'unknown'
        CHECK (
            hz_status IN (
                'inside',
                'outside',
                'too_hot',
                'too_cold',
                'unknown',
                'partially_inside'
            )
        ),

    data_completeness INTEGER
        CHECK (data_completeness BETWEEN 0 AND 100),

    -- Процедурная визуализация
    visual JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Версия генератора
    visual_version INTEGER NOT NULL DEFAULT 1,

    -- Метаданные
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.planets IS
    'Одна строка = одна экзопланета. Научные параметры NASA + visual JSONB для 3D-рендера.';
COMMENT ON COLUMN public.planets.id IS 'Строковый идентификатор планеты (совместим с Go-структурой Planet.ID).';
COMMENT ON COLUMN public.planets.name IS 'Имя планеты, уникальное (например, "LP 890-9 c").';
COMMENT ON COLUMN public.planets.host_star IS 'Имя родительской звезды; по нему выбираются все планеты системы.';
COMMENT ON COLUMN public.planets.esi IS
    'ESI-эвристика ExoScope 0..1; рассчитывается Go-бэкендом, БД только хранит.';
COMMENT ON COLUMN public.planets.habitability_index IS
    'Индекс обитаемости 0..100; рассчитывается Go-бэкендом, БД только хранит.';
COMMENT ON COLUMN public.planets.hz_status IS
    'Статус обитаемой зоны; рассчитывается Go-бэкендом (inside / partially_inside / ...).';
COMMENT ON COLUMN public.planets.data_completeness IS
    'Полнота научных данных 0..100; рассчитывается Go-бэкендом.';
COMMENT ON COLUMN public.planets.visual IS
    'Профиль процедурной генерации (archetype, palette, surface, atmosphere и т.п.).';
COMMENT ON COLUMN public.planets.visual_version IS 'Версия алгоритма генерации внешнего вида.';


-- =========================================================
-- 3. STARS
-- Отдельный справочник родительских звёзд
-- =========================================================

CREATE TABLE IF NOT EXISTS public.stars (
    id TEXT PRIMARY KEY,

    hostname TEXT NOT NULL UNIQUE,

    temperature_k DOUBLE PRECISION
        CHECK (temperature_k > 0),

    radius_solar DOUBLE PRECISION
        CHECK (radius_solar > 0),

    mass_solar DOUBLE PRECISION
        CHECK (mass_solar > 0),

    luminosity_log DOUBLE PRECISION,

    spectral_type TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.stars IS
    'Справочник родительских звёзд. Пока не связан FK с planets: Go-код ещё не сохраняет звёзды отдельно.';


-- =========================================================
-- 4. SYNC STATE
-- Состояние синхронизации с NASA
-- =========================================================

CREATE TABLE IF NOT EXISTS public.sync_state (
    job_name TEXT PRIMARY KEY,

    last_started_at TIMESTAMPTZ,

    last_success_at TIMESTAMPTZ,

    last_error TEXT,

    rows_affected INTEGER NOT NULL DEFAULT 0,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sync_state IS
    'Состояние фоновой синхронизации с NASA: когда стартовала/успешно завершилась, ошибка, сколько строк.';


-- =========================================================
-- 5. INDEXES
-- =========================================================

-- Поиск планет
CREATE INDEX IF NOT EXISTS planets_name_trgm_idx
ON public.planets
USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS planets_host_star_idx
ON public.planets (host_star);

-- TOP рейтинги
CREATE INDEX IF NOT EXISTS planets_habitability_idx
ON public.planets (
    habitability_index DESC NULLS LAST,
    name ASC
);

CREATE INDEX IF NOT EXISTS planets_esi_idx
ON public.planets (esi DESC NULLS LAST);

-- Фильтры
CREATE INDEX IF NOT EXISTS planets_radius_idx
ON public.planets (radius_earth);

CREATE INDEX IF NOT EXISTS planets_mass_idx
ON public.planets (mass_earth);

CREATE INDEX IF NOT EXISTS planets_temperature_idx
ON public.planets (eq_temp_k);

CREATE INDEX IF NOT EXISTS planets_distance_orbit_idx
ON public.planets (semi_major_axis_au);

CREATE INDEX IF NOT EXISTS planets_discovery_year_idx
ON public.planets (discovery_year);

CREATE INDEX IF NOT EXISTS planets_hz_status_idx
ON public.planets (hz_status);

-- GIN-индекс по visual намеренно не создаётся: профиль всегда читается целиком
-- вместе со строкой планеты, а индекс замедлял бы массовый Upsert.
-- Добавьте его, когда появятся запросы вида visual @> '{...}'.

-- Поиск звёзд
CREATE INDEX IF NOT EXISTS stars_hostname_trgm_idx
ON public.stars
USING GIN (hostname gin_trgm_ops);


-- =========================================================
-- 6. UPDATED_AT TRIGGER
-- =========================================================

CREATE OR REPLACE FUNCTION public.exoscope_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS planets_updated_at
ON public.planets;

CREATE TRIGGER planets_updated_at
BEFORE UPDATE ON public.planets
FOR EACH ROW
EXECUTE FUNCTION public.exoscope_set_updated_at();


DROP TRIGGER IF EXISTS stars_updated_at
ON public.stars;

CREATE TRIGGER stars_updated_at
BEFORE UPDATE ON public.stars
FOR EACH ROW
EXECUTE FUNCTION public.exoscope_set_updated_at();


DROP TRIGGER IF EXISTS sync_state_updated_at
ON public.sync_state;

CREATE TRIGGER sync_state_updated_at
BEFORE UPDATE ON public.sync_state
FOR EACH ROW
EXECUTE FUNCTION public.exoscope_set_updated_at();


-- =========================================================
-- 7. SEED: задача синхронизации NASA
-- =========================================================

INSERT INTO public.sync_state (job_name)
VALUES ('nasa_exoplanet_sync')
ON CONFLICT (job_name) DO NOTHING;


COMMIT;
