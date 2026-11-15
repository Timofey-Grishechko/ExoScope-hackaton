package server

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/timofey-grishechko/exoscope/internal/domain"
)

const (
	defaultLimit = 50
	// maxLimit покрывает весь каталог NASA (~6500 планет): фронтенд грузит его целиком
	// для дашборда и клиентской фильтрации.
	maxLimit = 10000
)

func (s *Server) listPlanets(w http.ResponseWriter, r *http.Request) {
	limit := defaultLimit
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	offset := 0
	if v := r.URL.Query().Get("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	q := r.URL.Query()
	filter := domain.PlanetFilter{
		Query:    q.Get("q"),
		HostStar: q.Get("host_star"),
		HZStatus: q.Get("hz_status"),
	}
	if filter.HZStatus != "" && !domain.ValidHZStatus(filter.HZStatus) {
		s.writeError(w, http.StatusBadRequest, "invalid hz_status")
		return
	}

	planets, err := s.repo.List(r.Context(), filter, limit, offset)
	if err != nil {
		s.log.Error("list planets failed", "err", err)
		s.writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	if planets == nil {
		planets = []domain.Planet{}
	}
	s.writeJSON(w, http.StatusOK, planets)
}

func (s *Server) getPlanet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		s.writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	p, err := s.repo.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			s.writeError(w, http.StatusNotFound, "planet not found")
			return
		}
		s.log.Error("get planet failed", "err", err, "id", id)
		s.writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	s.writeJSON(w, http.StatusOK, p)
}

// syncStatus отдаёт состояние синхронизации с NASA для блока «Статус данных» во фронтенде.
func (s *Server) syncStatus(w http.ResponseWriter, r *http.Request) {
	st, err := s.repo.GetSyncStatus(r.Context(), domain.SyncJobNASA)
	if err != nil {
		s.log.Error("get sync status failed", "err", err)
		s.writeError(w, http.StatusInternalServerError, "internal error")
		return
	}
	s.writeJSON(w, http.StatusOK, st)
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	s.writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
