package ingest_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/ingest"
)

type fakeNASA struct {
	planets []domain.RawPlanet
	err     error
}

func (f *fakeNASA) FetchAll(ctx context.Context) ([]domain.RawPlanet, error) {
	return f.planets, f.err
}

type fakeRepo struct {
	upsertedCount int
	stateCalls    int
}

func (f *fakeRepo) Upsert(ctx context.Context, planets []domain.Planet) (int, error) {
	f.upsertedCount += len(planets)
	return len(planets), nil
}

func (f *fakeRepo) UpdateSyncState(ctx context.Context, job string, started time.Time, success *time.Time, errMsg string, rows int) error {
	f.stateCalls++
	return nil
}

func TestService_Run(t *testing.T) {
	nasa := &fakeNASA{
		planets: []domain.RawPlanet{
			{Name: "Test Planet 1", HostName: "Host 1"},
			{Name: "Test Planet 2", HostName: "Host 2"},
		},
	}
	repo := &fakeRepo{}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	svc := ingest.New(nasa, repo, log)
	err := svc.Run(context.Background())

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if repo.upsertedCount != 2 {
		t.Errorf("expected 2 planets upserted, got %d", repo.upsertedCount)
	}
	if repo.stateCalls != 2 {
		t.Errorf("expected 2 state updates, got %d", repo.stateCalls)
	}
}

func TestService_Run_FetchError(t *testing.T) {
	nasa := &fakeNASA{err: errors.New("network error")}
	repo := &fakeRepo{}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	svc := ingest.New(nasa, repo, log)
	err := svc.Run(context.Background())

	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if repo.upsertedCount != 0 {
		t.Errorf("expected 0 planets upserted, got %d", repo.upsertedCount)
	}
}
