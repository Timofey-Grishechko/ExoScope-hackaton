package storage

import (
	"context"
	"time"
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
