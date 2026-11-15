# ExoScope — Go-бэкенд

* `cmd/api` — HTTP API (chi), порт `:8080`;
* `cmd/worker` — синхронизация с NASA Exoplanet Archive (cron: понедельник 03:00 UTC, или `-once`).

Обоим нужен `DATABASE_URL` (см. `.env.example`; роль `exoscope_app`).
Go 1.26+, зависимости: `go mod download`.

```bash
docker compose up -d                    # PostgreSQL + схема из db/init
cd backend
export DATABASE_URL=postgresql://exoscope_app:exoscope_app_dev@127.0.0.1:5433/exoscope?sslmode=disable
go run ./cmd/worker -once               # первичная загрузка из NASA
go run ./cmd/api
```

## API

| Метод и путь | Описание |
|---|---|
| `GET /api/v1/health` | проверка живости |
| `GET /api/v1/planets` | список, лучшие по `esi` первыми (при равенстве — по имени) |
| `GET /api/v1/planets/{id}` | одна планета |
| `GET /api/v1/status` | состояние синхронизации с NASA: `last_success_at`, `last_error`, `rows_affected`, `planets_total` |

Параметры списка: `limit` (по умолчанию 50, максимум 10000), `offset`,
`q` (подстрока имени), `host_star` (все планеты системы), `hz_status`
(`inside`, `partially_inside`, `outside`, `too_hot`, `too_cold`, `unknown`).

## Тесты

```bash
go test ./...
# интеграционный тест против реальной БД со схемой db/init:
TEST_DATABASE_URL='postgresql://exoscope_app:...@127.0.0.1:5433/exoscope?sslmode=disable' \
  go test ./internal/storage
```

## Контракт с БД

* значения `hz_status` — константы `domain.HZ*`, совпадают с CHECK в схеме;
* колонки — `planetCols` (`internal/storage/queries.go`);
* имя задачи синхронизации `nasa_exoplanet_sync` (`internal/ingest`), строка создаётся схемой;
* перед записью `transform.sanitize` обнуляет значения вне CHECK-диапазонов,
  `EnrichBatch` убирает дубли по `id`.

## Для фронтенда

* список отдаётся с `limit` до 10000 и сжимается gzip (`middleware.Compress`);
* `visual.seed` сериализуется строкой (`domain.Seed`); при чтении принимает и число,
  поэтому профили, сохранённые старым форматом, продолжают работать.
