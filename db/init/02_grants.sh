#!/usr/bin/env bash
# ExoScope: права на таблицы/последовательности/функции.
# Выполняется после 01_schema.sql (порядок задаётся именами файлов).
#
#   * app-роль  — SELECT, INSERT, UPDATE, DELETE + USAGE на последовательности;
#   * ro-роль   — только SELECT.
# Схема public закрыта для PUBLIC; права выдаются только явно.
# Мягкий набор опций: скрипт может выполняться и через `source` (так entrypoint
# запускает неисполняемые .sh), поэтому не включаем `-u`.
set -eo pipefail

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v db_owner="$POSTGRES_USER" \
    -v app_user="${APP_DB_USER:-exoscope_app}" \
    -v ro_user="${READONLY_DB_USER:-exoscope_ro}" <<'SQL'
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO :"app_user", :"ro_user";

-- Роль приложения: чтение и запись.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"app_user";

-- Роль только для чтения.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO :"ro_user";
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO :"ro_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO :"ro_user";

-- Те же права для объектов, которые владелец создаст позже.
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_owner" IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_owner" IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO :"app_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_owner" IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO :"app_user", :"ro_user";
ALTER DEFAULT PRIVILEGES FOR ROLE :"db_owner" IN SCHEMA public
    GRANT SELECT ON TABLES TO :"ro_user";
SQL
