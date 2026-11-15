package transform_test

import (
	"math"
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/transform"
)

func ptr[T any](v T) *T { return &v }

func TestEnrich(t *testing.T) {
	tests := []struct {
		name         string
		raw          domain.RawPlanet
		wantHZ       string
		wantESI      float64
		wantComplete int
	}{
		{
			name: "Earth twin (all data present)",
			raw: domain.RawPlanet{
				Name:          "Earth 2.0",
				HostName:      "Sun 2.0",
				RadiusEarth:   ptr(1.0),
				MassEarth:     ptr(1.0),
				EqTempK:       ptr(288.0),
				DiscoveryYear: ptr(2024),
			},
			wantHZ:       domain.HZInside,
			wantESI:      1.0,
			wantComplete: 100,
		},
		{
			name: "Hot planet, missing mass",
			raw: domain.RawPlanet{
				Name:          "Hot Stuff",
				HostName:      "Star A",
				RadiusEarth:   ptr(2.0),
				EqTempK:       ptr(500.0),
				DiscoveryYear: ptr(2020),
			},
			wantHZ:       domain.HZTooHot,
			wantESI:      0.70,
			wantComplete: 75,
		},
		{
			name: "Unknown planet (no data)",
			raw: domain.RawPlanet{
				Name:     "Mystery",
				HostName: "Dark Star",
			},
			wantHZ:       domain.HZUnknown,
			wantESI:      0,
			wantComplete: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := transform.Enrich(tt.raw)

			if got.HZStatus != tt.wantHZ {
				t.Errorf("HZStatus = %v, want %v", got.HZStatus, tt.wantHZ)
			}
			if math.Abs(got.ESI-tt.wantESI) > 0.01 {
				t.Errorf("ESI = %v, want %v", got.ESI, tt.wantESI)
			}
			if got.DataCompleteness != tt.wantComplete {
				t.Errorf("DataCompleteness = %v, want %v", got.DataCompleteness, tt.wantComplete)
			}
			if got.ID == "" {
				t.Error("ID должен генерироваться из имени, но он пуст")
			}
		})
	}
}

func TestEnrich_MapsExtendedFields(t *testing.T) {
	got := transform.Enrich(domain.RawPlanet{
		Name: "X b", HostName: "X",
		Density: ptr(5.5), Insolation: ptr(1.1),
		SemiMajorAxisAU: ptr(0.9), OrbitalPeriod: ptr(300.0), Eccentricity: ptr(0.1), InclinationDeg: ptr(89.0),
		ArgumentPeriastronDeg: ptr(10.0), PeriastronTimeJD: ptr(2450000.0),
		StarTempK: ptr(5700.0), StarRadiusSolar: ptr(1.0), StarMassSolar: ptr(1.0), StarLuminosityLog: ptr(0.0),
		StarSpectralType: ptr("G2 V"), DiscoveryMethod: ptr("Transit"),
	})
	if got.SemiMajorAxisAU == nil || *got.SemiMajorAxisAU != 0.9 || got.StarSpectralType == nil ||
		got.DiscoveryMethod == nil || got.StarTempK == nil || got.Density == nil {
		t.Errorf("расширенные поля NASA потеряны: %+v", got)
	}
}

func TestEnrich_SanitizesOutOfRange(t *testing.T) {
	got := transform.Enrich(domain.RawPlanet{
		Name: "Bad", HostName: "S",
		RadiusEarth: ptr(-1.0), Eccentricity: ptr(1.7), InclinationDeg: ptr(400.0), EqTempK: ptr(0.0),
	})
	if got.RadiusEarth != nil || got.Eccentricity != nil || got.InclinationDeg != nil || got.EqTempK != nil {
		t.Errorf("значения вне CHECK-диапазонов должны стать nil: %+v", got)
	}
}

func TestEnrichBatch_DedupesAndSkipsInvalid(t *testing.T) {
	got := transform.EnrichBatch([]domain.RawPlanet{
		{Name: "Kepler-1 b", HostName: "Kepler-1"},
		{Name: "Kepler 1 b", HostName: "Kepler-1"}, // тот же slug
		{Name: "", HostName: "S"},
		{Name: "No Star", HostName: ""},
	})
	if len(got) != 1 {
		t.Fatalf("ожидалась 1 планета, получили %d", len(got))
	}
}
