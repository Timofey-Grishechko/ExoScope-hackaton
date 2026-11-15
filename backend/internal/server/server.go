package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/timofey-grishechko/exoscope/internal/domain"
)

type PlanetReader interface {
	List(ctx context.Context, f domain.PlanetFilter, limit, offset int) ([]domain.Planet, error)
	GetByID(ctx context.Context, id string) (*domain.Planet, error)
	GetSyncStatus(ctx context.Context, job string) (*domain.SyncStatus, error)
}

type Server struct {
	repo PlanetReader
	log  *slog.Logger
}

func New(repo PlanetReader, log *slog.Logger) *Server {
	return &Server{repo: repo, log: log}
}

func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(15 * time.Second))
	// Полный список планет — несколько мегабайт JSON; gzip сжимает его примерно в 8 раз.
	r.Use(middleware.Compress(5, "application/json"))

	r.Use(s.logRequests)
	r.Use(s.cors)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", s.health)
		r.Get("/planets", s.listPlanets)
		r.Get("/planets/{id}", s.getPlanet)
		r.Get("/status", s.syncStatus)
	})

	return r
}
