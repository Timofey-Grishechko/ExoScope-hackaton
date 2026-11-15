package storage

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/timofey-grishechko/exoscope/internal/domain"
)

func (p *Postgres) UpdateSyncState(
	ctx context.Context,
	job string,
	started time.Time,
	success *time.Time,
	errMsg string,
	rows int,
) error {
	_, err := p.pool.Exec(ctx, qUpsertSyncState, job, started, success, errMsg, rows)
	return err
}

func (p *Postgres) GetSyncStatus(ctx context.Context, job string) (*domain.SyncStatus, error) {
	var st domain.SyncStatus
	err := p.pool.QueryRow(ctx, qGetSyncState, job).
		Scan(&st.LastStartedAt, &st.LastSuccessAt, &st.LastError, &st.RowsAffected)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}
	if err := p.pool.QueryRow(ctx, qCountPlanets).Scan(&st.PlanetsTotal); err != nil {
		return nil, err
	}
	return &st, nil
}
