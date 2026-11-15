package storage_test

import (
	"context"
	"os"
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/storage"
	"github.com/timofey-grishechko/exoscope/internal/transform"
	"github.com/timofey-grishechko/exoscope/internal/visual"
)

func fp(v float64) *float64 { return &v }
func sp(v string) *string   { return &v }
func ip(v int) *int         { return &v }

func TestUpsertAndQueries(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL не задан")
	}
	ctx := context.Background()
	db, err := storage.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	raws := []domain.RawPlanet{
		{Name: "Zeta b", HostName: "Zeta", RadiusEarth: fp(1.0), MassEarth: fp(1.0), EqTempK: fp(288),
			SemiMajorAxisAU: fp(1.0), OrbitalPeriod: fp(365), Eccentricity: fp(0.02), InclinationDeg: fp(89),
			StarTempK: fp(5700), StarSpectralType: sp("G2 V"), DiscoveryYear: ip(2020), DiscoveryMethod: sp("Transit")},
		{Name: "Zeta c", HostName: "Zeta", RadiusEarth: fp(10), MassEarth: fp(300), EqTempK: fp(900), SemiMajorAxisAU: fp(0.1)},
		{Name: "Nodata d", HostName: "Zeta"},
		{Name: "Dirty e", HostName: "Other", Eccentricity: fp(5), InclinationDeg: fp(-3)}, // вне CHECK -> nil
	}
	planets := transform.EnrichBatch(raws)
	for i := range planets {
		planets[i].Visual = visual.Compute(&planets[i])
	}

	n, err := db.Upsert(ctx, planets)
	if err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if n != 4 {
		t.Fatalf("rows = %d, want 4", n)
	}
	if _, err := db.Upsert(ctx, planets); err != nil { // идемпотентность
		t.Fatalf("second upsert: %v", err)
	}

	got, err := db.GetByID(ctx, "zeta-b")
	if err != nil {
		t.Fatal(err)
	}
	if got.SemiMajorAxisAU == nil || *got.SemiMajorAxisAU != 1.0 || got.StarSpectralType == nil ||
		*got.StarSpectralType != "G2 V" || got.DiscoveryMethod == nil || got.HZStatus != domain.HZInside {
		t.Errorf("расширенные поля не сохранились: %+v", got)
	}
	if got.Visual.Version != 1 || got.Visual.Archetype == "" {
		t.Errorf("visual: %+v", got.Visual)
	}

	top, err := db.List(ctx, domain.PlanetFilter{}, 50, 0)
	if err != nil {
		t.Fatal(err)
	}
	if len(top) < 4 || top[0].ID != "zeta-b" {
		t.Errorf("лидер рейтинга = %v", top[0].ID)
	}

	sys, err := db.List(ctx, domain.PlanetFilter{HostStar: "Zeta"}, 50, 0)
	if err != nil || len(sys) != 3 {
		t.Errorf("система Zeta: %d планет, err=%v", len(sys), err)
	}
	hz, err := db.List(ctx, domain.PlanetFilter{HZStatus: domain.HZInside}, 50, 0)
	if err != nil || len(hz) != 1 {
		t.Errorf("в обитаемой зоне: %d, err=%v", len(hz), err)
	}
	srch, err := db.List(ctx, domain.PlanetFilter{Query: "zeta"}, 50, 0)
	if err != nil || len(srch) != 2 {
		t.Errorf("поиск: %d, err=%v", len(srch), err)
	}
	if _, err := db.GetByID(ctx, "nope"); err != domain.ErrNotFound {
		t.Errorf("ожидали ErrNotFound, got %v", err)
	}
}
