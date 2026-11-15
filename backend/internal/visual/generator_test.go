package visual_test

import (
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
	"github.com/timofey-grishechko/exoscope/internal/visual"
)

func ptr[T any](v T) *T { return &v }

func TestCompute_Deterministic(t *testing.T) {
	planet := &domain.Planet{
		ID:          "kepler-442-b",
		RadiusEarth: ptr(1.3),
		MassEarth:   ptr(2.3),
	}

	v1 := visual.Compute(planet)
	v2 := visual.Compute(planet)

	if v1.Seed != v2.Seed {
		t.Errorf("Seed должен быть одинаковым: %d != %d", v1.Seed, v2.Seed)
	}
	if v1.Palette.Base != v2.Palette.Base {
		t.Errorf("Цвет должен быть одинаковым: %s != %s", v1.Palette.Base, v2.Palette.Base)
	}
}

func TestCompute_Archetypes(t *testing.T) {
	tests := []struct {
		name     string
		planet   *domain.Planet
		wantType string
	}{
		{
			name:     "Rocky",
			planet:   &domain.Planet{RadiusEarth: ptr(1.1), MassEarth: ptr(1.0)},
			wantType: "rocky",
		},
		{
			name:     "Gas Giant",
			planet:   &domain.Planet{RadiusEarth: ptr(10.0), MassEarth: ptr(300.0)},
			wantType: "gas_giant",
		},
		{
			name:     "Ice Giant",
			planet:   &domain.Planet{RadiusEarth: ptr(3.0), MassEarth: ptr(15.0)},
			wantType: "ice_giant",
		},
		{
			name:     "Unknown (no radius)",
			planet:   &domain.Planet{MassEarth: ptr(1.0)},
			wantType: "unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.planet.ID = "test-id"
			v := visual.Compute(tt.planet)
			if v.Archetype != tt.wantType {
				t.Errorf("Archetype = %v, want %v", v.Archetype, tt.wantType)
			}
		})
	}
}
