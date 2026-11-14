package storage

const qCreateStaging = `
CREATE TEMP TABLE planets_staging (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host_star TEXT NOT NULL,
    radius_earth DOUBLE PRECISION,
    mass_earth DOUBLE PRECISION,
    eq_temp_k DOUBLE PRECISION,
    esi DOUBLE PRECISION NOT NULL,
    habitability_index INTEGER NOT NULL,
    hz_status TEXT NOT NULL,
    data_completeness INTEGER NOT NULL,
    discovery_year INTEGER,
    visual JSONB NOT NULL
) ON COMMIT DROP`

const qUpsertFromStaging = `
INSERT INTO planets (
    id, name, host_star, radius_earth, mass_earth, eq_temp_k,
    esi, habitability_index, hz_status, data_completeness,
    discovery_year, visual, updated_at
)
SELECT id, name, host_star, radius_earth, mass_earth, eq_temp_k,
       esi, habitability_index, hz_status, data_completeness,
       discovery_year, visual, NOW()
FROM planets_staging
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    host_star = EXCLUDED.host_star,
    radius_earth = EXCLUDED.radius_earth,
    mass_earth = EXCLUDED.mass_earth,
    eq_temp_k = EXCLUDED.eq_temp_k,
    esi = EXCLUDED.esi,
    habitability_index = EXCLUDED.habitability_index,
    hz_status = EXCLUDED.hz_status,
    data_completeness = EXCLUDED.data_completeness,
    discovery_year = EXCLUDED.discovery_year,
    visual = EXCLUDED.visual,
    updated_at = NOW()`

const qListPlanets = `
SELECT id, name, host_star, radius_earth, mass_earth, eq_temp_k,
       esi, habitability_index, hz_status, data_completeness,
       discovery_year, visual
FROM planets
ORDER BY habitability_index DESC, name ASC
LIMIT $1 OFFSET $2`

const qGetPlanetByID = `
SELECT id, name, host_star, radius_earth, mass_earth, eq_temp_k,
       esi, habitability_index, hz_status, data_completeness,
       discovery_year, visual
FROM planets
WHERE id = $1`

const qUpsertSyncState = `
INSERT INTO sync_state (job_name, last_started_at, last_success_at, last_error, rows_affected)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (job_name) DO UPDATE SET
    last_started_at = EXCLUDED.last_started_at,
    last_success_at = COALESCE(EXCLUDED.last_success_at, sync_state.last_success_at),
    last_error = EXCLUDED.last_error,
    rows_affected = EXCLUDED.rows_affected`
