package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/timofey-grishechko/exoscope/backend/internal/domain"
)

var planetCols = []string{
	"id", "name", "host_star", "radius_earth", "mass_earth", "eq_temp_k",
	"esi", "habitability_index", "hz_status", "data_completeness",
	"discovery_year", "visual",
}

func (p *Postgres) Upsert(ctx context.Context, planets []domain.Planet) (int, error) {
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, qCreateStaging); err != nil {
		return 0, err
	}

	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{"planets_staging"},
		planetCols,
		pgx.CopyFromSlice(len(planets), func(i int) ([]any, error) {
			pl := planets[i]
			visualJSON, err := json.Marshal(pl.Visual)
			if err != nil {
				return nil, fmt.Errorf("marshal visual for %s: %w", pl.ID, err)
			}
			return []any{
				pl.ID, pl.Name, pl.HostStar,
				pl.RadiusEarth, pl.MassEarth, pl.EqTempK,
				pl.ESI, pl.HabitabilityIndex, pl.HZStatus, pl.DataCompleteness,
				pl.DiscoveryYear,
				visualJSON,
			}, nil
		}),
	)
	if err != nil {
		return 0, err
	}

	tag, err := tx.Exec(ctx, qUpsertFromStaging)
	if err != nil {
		return 0, err
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (p *Postgres) List(ctx context.Context, limit, offset int) ([]domain.Planet, error) {
	rows, err := p.pool.Query(ctx, qListPlanets, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]domain.Planet, 0, limit)
	for rows.Next() {
		pl, err := scanPlanet(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *pl)
	}
	return out, rows.Err()
}

func (p *Postgres) GetByID(ctx context.Context, id string) (*domain.Planet, error) {
	pl, err := scanPlanet(p.pool.QueryRow(ctx, qGetPlanetByID, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	return pl, err
}

func scanPlanet(row pgx.Row) (*domain.Planet, error) {
	var pl domain.Planet
	var visualJSON []byte
	err := row.Scan(
		&pl.ID, &pl.Name, &pl.HostStar, &pl.RadiusEarth, &pl.MassEarth, &pl.EqTempK,
		&pl.ESI, &pl.HabitabilityIndex, &pl.HZStatus, &pl.DataCompleteness,
		&pl.DiscoveryYear,
		&visualJSON,
	)

	if err != nil {
		return nil, err
	}
	if len(visualJSON) > 0 {
		if err := json.Unmarshal(visualJSON, &pl.Visual); err != nil {
			return nil, fmt.Errorf("unmarshal visual: %w", err)
		}
	}
	return &pl, nil
}
