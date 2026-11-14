package domain

import "time"

// SyncJobNASA — имя задачи синхронизации с NASA в таблице sync_state
// (строка создаётся схемой, см. db/init/01_schema.sql).
const SyncJobNASA = "nasa_exoplanet_sync"

// SyncStatus — состояние синхронизации каталога с NASA Exoplanet Archive.
type SyncStatus struct {
	LastStartedAt *time.Time `json:"last_started_at"`
	LastSuccessAt *time.Time `json:"last_success_at"`
	LastError     string     `json:"last_error"`
	RowsAffected  int        `json:"rows_affected"`
	PlanetsTotal  int        `json:"planets_total"`
}
