package domain

import "time"

const SyncJobNASA = "nasa_exoplanet_sync"

type SyncStatus struct {
	LastStartedAt *time.Time `json:"last_started_at"`
	LastSuccessAt *time.Time `json:"last_success_at"`
	LastError     string     `json:"last_error"`
	RowsAffected  int        `json:"rows_affected"`
	PlanetsTotal  int        `json:"planets_total"`
}
