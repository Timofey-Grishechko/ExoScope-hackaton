package storage

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/timofey-grishechko/exoscope/internal/domain"
)

func rowValues(pl domain.Planet) ([]any, error) {
	visualJSON, err := json.Marshal(pl.Visual)
	if err != nil {
		return nil, fmt.Errorf("marshal visual for %s: %w", pl.ID, err)
	}
	version := pl.Visual.Version
	if version <= 0 {
		version = 1
	}
	hz := pl.HZStatus
	if hz == "" {
		hz = domain.HZUnknown
	}
	return []any{
		pl.ID, pl.Name, pl.HostStar,
		pl.RadiusEarth, pl.MassEarth, pl.Density, pl.EqTempK, pl.Insolation,
		pl.SemiMajorAxisAU, pl.OrbitalPeriodDays, pl.Eccentricity, pl.InclinationDeg,
		pl.ArgumentPeriastronDeg, pl.PeriastronTimeJD,
		pl.StarTempK, pl.StarRadiusSolar, pl.StarMassSolar, pl.StarLuminosityLog, pl.StarSpectralType,
		pl.DiscoveryYear, pl.DiscoveryMethod,
		pl.ESI, pl.HabitabilityIndex, hz, pl.DataCompleteness,
		visualJSON, version,
	}, nil
}

func (p *Postgres) Upsert(ctx context.Context, planets []domain.Planet) (int, error) {
	planets = dedupeByID(planets)
	if len(planets) == 0 {
		return 0, nil
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, qCreateStaging); err != nil {
		return 0, fmt.Errorf("create staging: %w", err)
	}

	_, err = tx.CopyFrom(
		ctx,
		pgx.Identifier{"planets_staging"},
		planetCols,
		pgx.CopyFromSlice(len(planets), func(i int) ([]any, error) {
			return rowValues(planets[i])
		}),
	)
	if err != nil {
		return 0, fmt.Errorf("copy: %w", err)
	}

	tag, err := tx.Exec(ctx, qUpsertFromStaging)
	if err != nil {
		return 0, fmt.Errorf("upsert: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func dedupeByID(in []domain.Planet) []domain.Planet {
	idx := make(map[string]int, len(in))
	out := make([]domain.Planet, 0, len(in))
	for _, pl := range in {
		if i, ok := idx[pl.ID]; ok {
			out[i] = pl
			continue
		}
		idx[pl.ID] = len(out)
		out = append(out, pl)
	}
	return out
}

func (p *Postgres) List(ctx context.Context, f domain.PlanetFilter, limit, offset int) ([]domain.Planet, error) {
	sql, args := buildListQuery(f, limit, offset)
	rows, err := p.pool.Query(ctx, sql, args...)
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

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

func buildListQuery(f domain.PlanetFilter, limit, offset int) (string, []any) {
	var where []string
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(args))))
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		add("name ILIKE ?", "%"+likeEscaper.Replace(q)+"%") // использует pg_trgm-индекс
	}
	if f.HostStar != "" {
		add("host_star = ?", f.HostStar)
	}
	if f.HZStatus != "" {
		add("hz_status = ?", f.HZStatus)
	}

	sql := qListBase
	if len(where) > 0 {
		sql += " WHERE " + strings.Join(where, " AND ")
	}
	args = append(args, limit, offset)
	sql += listOrder + " LIMIT $" + strconv.Itoa(len(args)-1) + " OFFSET $" + strconv.Itoa(len(args))
	return sql, args
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
	var visualVersion int
	err := row.Scan(
		&pl.ID, &pl.Name, &pl.HostStar,
		&pl.RadiusEarth, &pl.MassEarth, &pl.Density, &pl.EqTempK, &pl.Insolation,
		&pl.SemiMajorAxisAU, &pl.OrbitalPeriodDays, &pl.Eccentricity, &pl.InclinationDeg,
		&pl.ArgumentPeriastronDeg, &pl.PeriastronTimeJD,
		&pl.StarTempK, &pl.StarRadiusSolar, &pl.StarMassSolar, &pl.StarLuminosityLog, &pl.StarSpectralType,
		&pl.DiscoveryYear, &pl.DiscoveryMethod,
		&pl.ESI, &pl.HabitabilityIndex, &pl.HZStatus, &pl.DataCompleteness,
		&visualJSON, &visualVersion,
	)
	if err != nil {
		return nil, err
	}
	if len(visualJSON) > 0 {
		if err := json.Unmarshal(visualJSON, &pl.Visual); err != nil {
			return nil, fmt.Errorf("unmarshal visual: %w", err)
		}
	}
	if pl.Visual.Version == 0 {
		pl.Visual.Version = visualVersion
	}
	return &pl, nil
}
