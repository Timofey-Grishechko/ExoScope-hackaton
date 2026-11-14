# ExoScope

Каталог экзопланет по данным NASA Exoplanet Archive: PostgreSQL + Go-бэкенд + React-фронтенд.

```
db/        схема PostgreSQL, роли и права (docker-entrypoint-initdb.d)
backend/   Go: api (HTTP) и worker (синхронизация с NASA)
frontend/  React + Vite + Three.js
```

## Запуск

Нужны Docker, Go 1.26+ и Node.js 20+.

```bash
# 1. База данных (схема и роли создаются автоматически при первом старте)
docker compose up -d

# 2. Бэкенд: загрузить каталог NASA (один раз) и запустить API на :8080
cd backend
export DATABASE_URL='postgresql://exoscope_app:exoscope_app_dev@127.0.0.1:5433/exoscope?sslmode=disable'
go run ./cmd/worker -once
go run ./cmd/api

# 3. Фронтенд (в другом терминале) -> http://127.0.0.1:5173
cd frontend
npm install
npm run dev
```

Windows PowerShell: `$env:DATABASE_URL='...'` вместо `export`.
Адрес API фронтенда задаётся `VITE_API_URL` (`frontend/.env.example`),
по умолчанию `http://localhost:8080/api/v1`.

Подробности: `db/README.md`, `backend/README.md`.

## Контракт фронтенд — бэкенд

* API под `/api/v1`; фронтенд грузит весь каталог одним запросом `GET /planets?limit=10000`
  (ответ сжимается gzip), фильтрует и сортирует на клиенте (порядок — по ESI, как и на сервере);
* блок «Статус данных» берёт состояние из `GET /status` (`sync_state`), обновляется раз в минуту;
* `hz_status`: `inside`, `partially_inside`, `outside`, `too_hot`, `too_cold`, `unknown`
  (`domain.HZ*` в Go, `HZStatus` в `frontend/src/types/planet.ts`, CHECK в БД);
* `visual.seed` — строка (uint64 не помещается в JS number без потери точности);
* `visual.archetype`: `rocky`, `rocky_candidate`, `gas_giant`, `ice_giant`, `unknown`.
