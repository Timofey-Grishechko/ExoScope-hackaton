package ingest

import (
	"context"
	"log/slog"
	"time"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/transform"
	"github.com/timofey-grishechko/exoscope/internal/visual"
)

type NASAClient interface {
	FetchAll(ctx context.Context) ([]domain.RawPlanet, error)
}

type Repository interface {
	Upsert(ctx context.Context, planets []domain.Planet) (int, error)
	UpdateSyncState(ctx context.Context, job string, started time.Time, success *time.Time, errMsg string, rows int) error
}

type Service struct {
	nasa NASAClient
	repo Repository
	log  *slog.Logger
}

func New(nasa NASAClient, repo Repository, log *slog.Logger) *Service {
	return &Service{nasa: nasa, repo: repo, log: log}
}

const jobName = "nasa_exoplanet_sync"

func (s *Service) Run(ctx context.Context) error {
	started := time.Now().UTC()
	_ = s.repo.UpdateSyncState(ctx, jobName, started, nil, "", 0)

	s.log.Info("fetching from NASA")
	raw, err := s.nasa.FetchAll(ctx)
	if err != nil {
		_ = s.repo.UpdateSyncState(ctx, jobName, started, nil, err.Error(), 0)
		return err
	}
	s.log.Info("fetched", "count", len(raw))

	planets := transform.EnrichBatch(raw)
	for i := range planets {
		planets[i].Visual = visual.Compute(&planets[i])
	}

	s.log.Info("upserting", "count", len(planets))
	rows, err := s.repo.Upsert(ctx, planets)
	if err != nil {
		_ = s.repo.UpdateSyncState(ctx, jobName, started, nil, err.Error(), 0)
		return err
	}

	now := time.Now().UTC()
	_ = s.repo.UpdateSyncState(ctx, jobName, started, &now, "", rows)
	s.log.Info("upsert done", "rows", rows, "duration_ms", time.Since(started).Milliseconds())
	return nil
}
