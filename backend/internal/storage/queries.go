package storage

import (
	"fmt"
	"strings"
)

var planetCols = []string{
	"id", "name", "host_star",
	"radius_earth", "mass_earth", "density", "eq_temp_k", "insolation",
	"semi_major_axis_au", "orbital_period_days", "eccentricity", "inclination_deg",
	"argument_periastron_deg", "periastron_time_jd",
	"star_temp_k", "star_radius_solar", "star_mass_solar", "star_luminosity_log", "star_spectral_type",
	"discovery_year", "discovery_method",
	"esi", "habitability_index", "hz_status", "data_completeness",
	"visual", "visual_version",
}

var (
	selectCols = strings.Join(planetCols, ", ")

	qCreateStaging = `CREATE TEMP TABLE planets_staging
		(LIKE public.planets INCLUDING DEFAULTS) ON COMMIT DROP`

	qUpsertFromStaging = buildUpsert()

	qListBase = `SELECT ` + selectCols + ` FROM public.planets`

	listOrder = ` ORDER BY esi DESC NULLS LAST, name ASC`

	qGetPlanetByID = qListBase + ` WHERE id = $1`
)

func buildUpsert() string {
	sets := make([]string, 0, len(planetCols))
	for _, c := range planetCols {
		if c != "id" {
			sets = append(sets, c+" = EXCLUDED."+c)
		}
	}
	return fmt.Sprintf(`INSERT INTO public.planets (%[1]s)
SELECT %[1]s FROM planets_staging
ON CONFLICT (id) DO UPDATE SET %[2]s`, selectCols, strings.Join(sets, ", "))
}

const qGetSyncState = `
SELECT last_started_at, last_success_at, COALESCE(last_error, ''), rows_affected
FROM sync_state WHERE job_name = $1`

const qCountPlanets = `SELECT count(*) FROM public.planets`

const qUpsertSyncState = `
INSERT INTO sync_state (job_name, last_started_at, last_success_at, last_error, rows_affected)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (job_name) DO UPDATE SET
    last_started_at = EXCLUDED.last_started_at,
    last_success_at = COALESCE(EXCLUDED.last_success_at, sync_state.last_success_at),
    last_error = EXCLUDED.last_error,
    rows_affected = EXCLUDED.rows_affected`
