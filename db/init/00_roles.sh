#!/usr/bin/env bash
# ExoScope: роли БД и доступы.
# Выполняется один раз при инициализации пустого тома (docker-entrypoint-initdb.d).
#
# Создаёт:
#   * роль приложения       (APP_DB_USER / APP_DB_PASSWORD)               — DML;
#   * роль только для чтения (READONLY_DB_USER / READONLY_DB_PASSWORD)    — SELECT.
# Пароли приходят из окружения контейнера (docker-compose.yml -> .env).
# Мягкий набор опций: скрипт может выполняться и через `source` (так entrypoint
# запускает неисполняемые .sh), поэтому не включаем `-u`, чтобы не менять
# поведение родительского shell. Все переменные ниже имеют значения по умолчанию.
set -eo pipefail

APP_DB_USER="${APP_DB_USER:-exoscope_app}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-exoscope_app_dev}"
READONLY_DB_USER="${READONLY_DB_USER:-exoscope_ro}"
READONLY_DB_PASSWORD="${READONLY_DB_PASSWORD:-exoscope_ro_dev}"

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v app_user="$APP_DB_USER" \
    -v app_password="$APP_DB_PASSWORD" \
    -v ro_user="$READONLY_DB_USER" \
    -v ro_password="$READONLY_DB_PASSWORD" \
    -v db_name="$POSTGRES_DB" <<'SQL'
-- Роли создаются без пароля, затем пароль/LOGIN выставляются ALTER ROLE:
-- так скрипт остаётся идемпотентным и обновляет пароль при повторном запуске.
SELECT format('CREATE ROLE %I', :'app_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password')
\gexec

SELECT format('CREATE ROLE %I', :'ro_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'ro_user')
\gexec

SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'ro_user', :'ro_password')
\gexec

-- Доступ к самой БД: у PUBLIC отбираем всё, выдаём только двум ролям.
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user", :"ro_user";
-- Upsert бэкенда создаёт TEMP-таблицу planets_staging. REVOKE ALL выше снял эту
-- привилегию с PUBLIC, поэтому app-роли выдаём TEMPORARY явно (иначе синхронизация
-- упадёт с «permission denied to create temporary tables»).
GRANT TEMPORARY ON DATABASE :"db_name" TO :"app_user";
SQL
