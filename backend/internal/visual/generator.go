package visual

import (
	"hash/fnv"
	"math"

	"github.com/timofey-grishechko/exoscope/internal/domain"
)

const GeneratorVersion = 1

func Compute(p *domain.Planet) domain.Visual {
	seed := seedFromID(p.ID)
	rng := newRNG(seed)

	archetype := classify(p)

	visual := domain.Visual{
		Version:   GeneratorVersion,
		Seed:      domain.Seed(seed),
		Archetype: archetype,
	}

	visual.Palette = generatePalette(archetype, rng)
	visual.Surface = generateSurface(archetype, rng)
	visual.Atmosphere = generateAtmosphere(archetype, rng)

	return visual
}

func classify(p *domain.Planet) string {
	if p.RadiusEarth == nil {
		return "unknown"
	}

	radius := *p.RadiusEarth

	if radius <= 0 {
		return "unknown"
	}

	if p.MassEarth != nil && *p.MassEarth > 0 {
		densityRatio := *p.MassEarth / math.Pow(radius, 3)

		if radius <= 1.6 && densityRatio >= 0.65 {
			return "rocky"
		}

		if radius >= 4 && densityRatio <= 1.5 {
			return "gas_giant"
		}

		if radius >= 2.5 && radius < 4 && densityRatio <= 0.8 {
			return "ice_giant"
		}

		return "unknown"
	}

	if radius <= 1.2 {
		return "rocky_candidate"
	}

	return "unknown"
}

func generatePalette(
	archetype string,
	rng *RNG,
) domain.ColorPalette {

	palettes := map[string][]domain.ColorPalette{
		"rocky": {
			{
				Base:      "#81766C",
				Secondary: "#A68D75",
				Accent:    "#C1A58A",
				Dark:      "#403B38",
			},
			{
				Base:      "#827C73",
				Secondary: "#B2A08B",
				Accent:    "#D0BCA2",
				Dark:      "#46423E",
			},
			{
				Base:      "#77594C",
				Secondary: "#A77B60",
				Accent:    "#C79B75",
				Dark:      "#382C29",
			},
		},

		"rocky_candidate": {
			{
				Base:      "#82776B",
				Secondary: "#A18B76",
				Accent:    "#C2A78B",
				Dark:      "#403832",
			},
		},

		"gas_giant": {
			{
				Base:      "#C18E6A",
				Secondary: "#D6B28B",
				Accent:    "#8E5D4B",
				Dark:      "#563B36",
			},
			{
				Base:      "#B18D72",
				Secondary: "#D4C0A2",
				Accent:    "#80685C",
				Dark:      "#4D403B",
			},
		},

		"ice_giant": {
			{
				Base:      "#4E8DAF",
				Secondary: "#79B7C9",
				Accent:    "#B0D6D9",
				Dark:      "#254B6A",
			},
			{
				Base:      "#638DAE",
				Secondary: "#A0C5D4",
				Accent:    "#C5DFE4",
				Dark:      "#304D70",
			},
		},

		"unknown": {
			{
				Base:      "#77777F",
				Secondary: "#9696A4",
				Accent:    "#B8B8C5",
				Dark:      "#41414A",
			},
		},
	}

	options := palettes[archetype]

	if len(options) == 0 {
		options = palettes["unknown"]
	}

	return options[rng.RangeI(0, len(options)-1)]
}

func generateSurface(
	archetype string,
	rng *RNG,
) domain.SurfaceConfig {

	switch archetype {

	case "rocky", "rocky_candidate":
		return domain.SurfaceConfig{
			NoiseScale:       rng.RangeF(2.0, 4.5),
			NoiseOctaves:     rng.RangeI(5, 7),
			NoisePersistence: rng.RangeF(0.45, 0.6),
			MountainStrength: rng.RangeF(0.25, 0.7),
			RidgeSharpness:   rng.RangeF(0.4, 0.8),
			CraterDensity:    rng.RangeF(0.3, 0.8),
			CraterSize:       rng.RangeF(0.03, 0.09),
			CraterDepth:      rng.RangeF(0.2, 0.5),
			OceanCoverage:    0,
			Roughness:        rng.RangeF(0.7, 0.95),
		}

	case "gas_giant":
		return domain.SurfaceConfig{
			NoiseScale:       rng.RangeF(1.0, 2.5),
			NoiseOctaves:     4,
			NoisePersistence: 0.5,
			Roughness:        0.3,
		}

	case "ice_giant":
		return domain.SurfaceConfig{
			NoiseScale:       rng.RangeF(2.0, 3.5),
			NoiseOctaves:     5,
			NoisePersistence: 0.5,
			Roughness:        0.45,
		}

	default:
		return domain.SurfaceConfig{
			NoiseScale:       2.5,
			NoiseOctaves:     4,
			NoisePersistence: 0.5,
			Roughness:        0.6,
		}
	}
}

func generateAtmosphere(
	archetype string,
	rng *RNG,
) domain.AtmosphereConfig {

	switch archetype {

	case "gas_giant":
		return domain.AtmosphereConfig{
			Enabled: true,
			Opacity: rng.RangeF(0.6, 0.9),
			Glow:    rng.RangeF(0.3, 0.6),
			Clouds:  rng.RangeF(0.6, 0.95),
			Color:   "#E8C6A5",
		}

	case "ice_giant":
		return domain.AtmosphereConfig{
			Enabled: true,
			Opacity: rng.RangeF(0.4, 0.7),
			Glow:    rng.RangeF(0.3, 0.5),
			Clouds:  rng.RangeF(0.4, 0.8),
			Color:   "#8FC9E0",
		}

	case "rocky", "rocky_candidate":
		return domain.AtmosphereConfig{
			Enabled: true,
			Opacity: rng.RangeF(0.1, 0.4),
			Glow:    rng.RangeF(0.1, 0.3),
			Clouds:  rng.RangeF(0.1, 0.4),
			Color:   "#A6B9C8",
		}

	default:
		return domain.AtmosphereConfig{
			Enabled: false,
			Opacity: 0,
			Glow:    0,
			Clouds:  0,
			Color:   "#888888",
		}
	}
}

func seedFromID(id string) uint64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(id))
	return h.Sum64()
}
