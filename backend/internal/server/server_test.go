package server_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/server"
)

type fakeRepo struct {
	planets []domain.Planet
	byID    map[string]domain.Planet
}

func (f *fakeRepo) List(ctx context.Context, _ domain.PlanetFilter, limit, offset int) ([]domain.Planet, error) {
	if offset >= len(f.planets) {
		return []domain.Planet{}, nil
	}
	end := offset + limit
	if end > len(f.planets) {
		end = len(f.planets)
	}
	return f.planets[offset:end], nil
}

func (f *fakeRepo) GetByID(ctx context.Context, id string) (*domain.Planet, error) {
	p, ok := f.byID[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return &p, nil
}

func (f *fakeRepo) GetSyncStatus(ctx context.Context, job string) (*domain.SyncStatus, error) {
	return &domain.SyncStatus{PlanetsTotal: len(f.planets)}, nil
}

func setupTest(repo server.PlanetReader) http.Handler {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	return server.New(repo, log).Handler()
}

func TestListPlanets(t *testing.T) {
	repo := &fakeRepo{
		planets: []domain.Planet{
			{ID: "p1", Name: "Planet 1"},
			{ID: "p2", Name: "Planet 2"},
		},
	}
	h := setupTest(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/planets", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var got []domain.Planet
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2 planets, got %d", len(got))
	}
}

func TestListPlanets_Empty(t *testing.T) {
	repo := &fakeRepo{planets: []domain.Planet{}}
	h := setupTest(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/planets", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Body.String() != "[]\n" {
		t.Errorf("expected empty array, got: %s", rec.Body.String())
	}
}

func TestGetPlanet(t *testing.T) {
	repo := &fakeRepo{
		byID: map[string]domain.Planet{
			"kepler-442-b": {ID: "kepler-442-b", Name: "Kepler-442 b"},
		},
	}
	h := setupTest(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/planets/kepler-442-b", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestGetPlanet_NotFound(t *testing.T) {
	repo := &fakeRepo{byID: map[string]domain.Planet{}}
	h := setupTest(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/planets/nope", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
}

func TestListPlanets_InvalidHZStatus(t *testing.T) {
	h := setupTest(&fakeRepo{})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/planets?hz_status=in", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
}

func TestSyncStatus(t *testing.T) {
	h := setupTest(&fakeRepo{planets: []domain.Planet{{ID: "p1", Name: "Planet 1"}}})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var got domain.SyncStatus
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if got.PlanetsTotal != 1 || got.LastSuccessAt != nil {
		t.Errorf("unexpected status: %+v", got)
	}
}
