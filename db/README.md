# ExoScope — база данных (PostgreSQL в Docker)

Слой данных для ExoScope: PostgreSQL 18 в Docker, три таблицы (`planets`,
`stars`, `sync_state`). ESI, индекс обитаемости и статус обитаемой зоны
рассчитывает бэкенд, БД их только хранит. Визуальный профиль для процедурной
генерации лежит в `planets.visual` (JSONB). Данные не заполняются — готовится
структура, доступы и ограничения.

```
.
├── docker-compose.yml        # сервис postgres:18-alpine, healthcheck, том, порт
├── .env                      # локальные dev-пароли (в .env.example — шаблон)
└── db/
    ├── README.md             # этот файл
    └── init/
        ├── 00_roles.sh       # роли exoscope_app / exoscope_ro и CONNECT
        ├── 01_schema.sql     # расширение, таблицы, индексы, триггеры, seed sync_state
        └── 02_grants.sh      # гранты на таблицы/последовательности/функции
```

## Быстрый старт

Нужен Docker с Compose v2 (Docker Desktop на Windows/macOS или docker engine + compose на Linux).

```bash
docker compose up -d          # поднять PostgreSQL и выполнить init-скрипты
docker compose ps             # контейнер должен быть healthy
docker compose logs -f postgres
```

Проверка, что схема создалась:

```bash
docker compose exec postgres psql -U exoscope -d exoscope -c '\dt'
docker compose exec postgres psql -U exoscope -d exoscope \
  -c "select table_name, count(*) as columns from information_schema.columns
      where table_schema='public' group by table_name order by table_name;"
```

Остановка / полный сброс (удаляет данные и заново выполняет init-скрипты):

```bash
docker compose down           # остановить, данные сохранить
docker compose down -v        # остановить и удалить том exoscope_pgdata
```

> Init-скрипты из `db/init` выполняются **только при первом старте на пустом томе**.
> Если меняли SQL и хотите применить его к уже существующей БД — сделайте `docker compose down -v`
> (данные пропадут) либо примените файл вручную через `psql -f`.

> Порт по умолчанию — `5433` (`POSTGRES_PORT` в `.env`), чтобы не конфликтовать
> с локально установленным PostgreSQL, который обычно занимает `5432`.

## Доступы

| Роль              | Назначение            | Права                                              |
|-------------------|-----------------------|----------------------------------------------------|
| `exoscope`        | владелец БД, админ    | суперпользователь контейнера                       |
| `exoscope_app`    | backend               | `SELECT, INSERT, UPDATE, DELETE`, `USAGE` на seq   |
| `exoscope_ro`     | аналитика / read-only | только `SELECT`                                    |

Пароли и имена ролей задаются в `.env` (шаблон — `.env.example`).
Порт публикуется только на `127.0.0.1`; схема `public` закрыта для `PUBLIC`,
`CONNECT` на БД выдан только двум ролям.

Строки подключения (значения по умолчанию из `.env`):

```
# backend (чтение/запись)
postgresql://exoscope_app:exoscope_app_dev@127.0.0.1:5433/exoscope?sslmode=disable

# read-only
postgresql://exoscope_ro:exoscope_ro_dev@127.0.0.1:5433/exoscope?sslmode=disable

# админ (миграции, psql)
postgresql://exoscope:exoscope_dev_pg@127.0.0.1:5433/exoscope?sslmode=disable
```

## Доступы

| Роль              | Назначение            | Права                                              |
|-------------------|-----------------------|----------------------------------------------------|
| `exoscope`        | владелец БД, админ    | суперпользователь контейнера                       |
| `exoscope_app`    | backend               | `SELECT, INSERT, UPDATE, DELETE`, `USAGE` на seq   |
| `exoscope_ro`     | аналитика / read-only | только `SELECT`                                    |

Пароли и имена ролей задаются в `.env` (шаблон — `.env.example`).
Порт публикуется только на `127.0.0.1`; схема `public` закрыта для `PUBLIC`,
`CONNECT` на БД выдан только двум ролям.

Строки подключения (значения по умолчанию из `.env`):

```
# backend (чтение/запись)
postgresql://exoscope_app:exoscope_app_dev@127.0.0.1:5433/exoscope?sslmode=disable

# read-only
postgresql://exoscope_ro:exoscope_ro_dev@127.0.0.1:5433/exoscope?sslmode=disable

# админ (миграции, psql)
postgresql://exoscope:exoscope_dev_pg@127.0.0.1:5433/exoscope?sslmode=disable
```

## Модель данных

```
planets     — одна строка = одна экзопланета (наука + расчёт + visual JSONB)
stars       — справочник звёзд (пока без FK и без записи из Go)
sync_state  — состояние синхронизации с NASA (job_name = 'nasa_exoplanet_sync')
```

Все планеты системы выбираются по `planets.host_star`. Параметры звезды пока
дублируются в каждой планете (`star_*`); таблица `stars` появилась как задел:
когда Go начнёт сохранять звёзды, добавьте `planets.star_id` с FK отдельной
миграцией. Таблицы `observations` и `satellites` в схему не входят.

### `planets`

* идентификация: `id` (TEXT, PK), `name` (UNIQUE), `host_star`;
* физика: `radius_earth`, `mass_earth`, `density`, `eq_temp_k`, `insolation`;
* орбита: `semi_major_axis_au`, `orbital_period_days`, `eccentricity`,
  `inclination_deg` (0..180), `argument_periastron_deg`, `periastron_time_jd`;
* звезда: `star_temp_k`, `star_radius_solar`, `star_mass_solar`,
  `star_luminosity_log`, `star_spectral_type`;
* открытие: `discovery_year`, `discovery_method`;
* расчёт (Go): `esi` 0..1, `habitability_index` 0..100, `hz_status`
  (`inside`, `partially_inside`, `outside`, `too_hot`, `too_cold`, `unknown`),
  `data_completeness` 0..100;
* визуал: `visual` (JSONB, NOT NULL, по умолчанию `{}`), `visual_version`;
* служебные: `created_at`, `updated_at` (обновляется триггером).

Повторная синхронизация идёт через `INSERT ... ON CONFLICT (id) DO UPDATE`
(в Go: `storage.Postgres.Upsert` — `CopyFrom` в temp-таблицу + upsert одной транзакцией;
роли `exoscope_app` для этого нужна привилегия `TEMPORARY`, она выдаётся в `00_roles.sh`).
Список колонок задан один раз (`planetCols` в `backend/internal/storage/queries.go`),
поэтому новые научные поля не теряются при сохранении: добавили колонку в схему,
в `planetCols`, `rowValues()` и `scanPlanet` — `TestColumnsMatch` поймает рассинхрон.

### Типовые запросы

NULL в рейтингах нужно сортировать в конец: в PostgreSQL при `DESC` NULL по
умолчанию идут **первыми**, и планеты без данных вытеснили бы лидеров.

```sql
-- TOP-50
SELECT * FROM planets
ORDER BY habitability_index DESC NULLS LAST, name ASC LIMIT 50;

-- Поиск (используется pg_trgm)
SELECT * FROM planets WHERE name ILIKE '%' || $1 || '%'
ORDER BY habitability_index DESC NULLS LAST LIMIT 20;

-- Система
SELECT * FROM planets WHERE host_star = $1
ORDER BY semi_major_axis_au ASC NULLS LAST;

-- В обитаемой зоне
SELECT * FROM planets WHERE hz_status IN ('inside', 'partially_inside')
ORDER BY habitability_index DESC NULLS LAST;

-- Статистика
SELECT COUNT(*) AS total_planets, AVG(esi) AS average_esi,
       AVG(eq_temp_k) AS average_temperature,
       COUNT(*) FILTER (WHERE hz_status = 'inside') AS planets_in_hz
FROM planets;
```

### ESI и расчётные поля

ESI — собственная эвристика ExoScope, а не стандартный Earth Similarity Index и
не вероятность обитаемости. Формулы живут в Go; БД отвечает только за хранение
и проверку диапазонов (CHECK). SQL-функций и генерируемых столбцов нет.

### Визуализация: `visual` и `visual_version`

Научные данные и художественная генерация разделены логически: внешний вид
лежит в `visual` (JSONB), `visual_version` — версия алгоритма. Профиль
генерируется Go один раз, React/Three.js получает готовый JSON. При смене
генератора можно пересчитать `visual`, не трогая научные поля.

```json
{
  "archetype": "rocky",
  "palette": {"base": "#81766C", "secondary": "#A68D75", "accent": "#C1A58A", "dark": "#403B38"},
  "surface": {"noise_scale": 3.2, "noise_octaves": 6, "mountain_strength": 0.45,
              "crater_density": 0.65, "roughness": 0.85},
  "atmosphere": {"enabled": true, "color": "#A6B9C8", "opacity": 0.25, "glow": 0.2, "clouds": 0.3}
}
```

### `sync_state`

Одна строка на задачу: `last_started_at`, `last_success_at`, `last_error`,
`rows_affected`. Строка `nasa_exoplanet_sync` создаётся схемой.

## Индексы

* `planets`: GIN `pg_trgm` по `name`; btree по `host_star`, `radius_earth`,
  `mass_earth`, `eq_temp_k`, `semi_major_axis_au`, `discovery_year`, `hz_status`;
  `(habitability_index DESC NULLS LAST, name)` и `esi DESC NULLS LAST` для TOP-списков.
* `stars`: GIN `pg_trgm` по `hostname`.
* GIN по `visual` не создан намеренно: профиль читается целиком, а индекс
  замедлял бы массовый Upsert. Добавьте при появлении запросов `visual @> ...`.

Индексировать каждое поле не нужно: смотрите `EXPLAIN ANALYZE` по реальным запросам.

## Миграции

`01_schema.sql` рассчитан на пустую БД и использует `CREATE TABLE IF NOT EXISTS`,
поэтому **повторный запуск не изменит уже существующие таблицы**. Изменения
структуры оформляйте отдельными `ALTER TABLE`-миграциями
(`db/migrations/0002_....sql`). В файле нет psql-метакоманд, `ON_ERROR_STOP`
задаётся клиентом (`psql -v ON_ERROR_STOP=1`).

## Модель доступа и безопасность


* `PUBLIC` не имеет прав на схему `public` и не может подключиться к БД;
* `exoscope_app` не может создавать объекты (DDL) — только DML;
* `exoscope_ro` — только чтение;
* права на будущие таблицы/последовательности/функции владельца выданы
  через `ALTER DEFAULT PRIVILEGES`, т.е. новые миграции не требуют ручных грантов;
* порт слушает только `127.0.0.1`;
* пароли в `.env` — dev-значения, перед публикацией/передачей проекта их нужно заменить.

## Замечания

* Образ `postgres:18-alpine`: в 18+ `PGDATA=/var/lib/postgresql/18/docker`,
  поэтому том монтируется в `/var/lib/postgresql`.
* Том `exoscope_pgdata` переживает `docker compose down`; удаляется только `down -v`.
* Схема проверена на PostgreSQL 16 (ограничения, NULLS LAST, триггер, upsert через
  staging); на PostgreSQL 18 из образа compose перед релизом стоит прогнать ещё раз.
