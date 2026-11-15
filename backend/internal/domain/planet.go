package domain

import (
	"fmt"
	"strconv"
	"strings"
)

type Seed uint64

func (s Seed) MarshalJSON() ([]byte, error) {
	return []byte(`"` + strconv.FormatUint(uint64(s), 10) + `"`), nil
}

func (s *Seed) UnmarshalJSON(b []byte) error {
	v, err := strconv.ParseUint(strings.Trim(string(b), `"`), 10, 64)
	if err != nil {
		return fmt.Errorf("invalid seed %s: %w", b, err)
	}
	*s = Seed(v)
	return nil
}

const (
	HZInside          = "inside"
	HZPartiallyInside = "partially_inside"
	HZOutside         = "outside"
	HZTooHot          = "too_hot"
	HZTooCold         = "too_cold"
	HZUnknown         = "unknown"
)

func ValidHZStatus(s string) bool {
	switch s {
	case HZInside, HZPartiallyInside, HZOutside, HZTooHot, HZTooCold, HZUnknown:
		return true
	}
	return false
}

type PlanetFilter struct {
	Query    string
	HostStar string
	HZStatus string
}

type Planet struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	HostStar string `json:"host_star"`

	RadiusEarth *float64 `json:"radius_earth"`
	MassEarth   *float64 `json:"mass_earth"`
	Density     *float64 `json:"density"`
	EqTempK     *float64 `json:"eq_temp_k"`
	Insolation  *float64 `json:"insolation"`

	SemiMajorAxisAU       *float64 `json:"semi_major_axis_au"`
	OrbitalPeriodDays     *float64 `json:"orbital_period_days"`
	Eccentricity          *float64 `json:"eccentricity"`
	InclinationDeg        *float64 `json:"inclination_deg"`
	ArgumentPeriastronDeg *float64 `json:"argument_periastron_deg"`
	PeriastronTimeJD      *float64 `json:"periastron_time_jd"`

	StarTempK         *float64 `json:"star_temp_k"`
	StarRadiusSolar   *float64 `json:"star_radius_solar"`
	StarMassSolar     *float64 `json:"star_mass_solar"`
	StarLuminosityLog *float64 `json:"star_luminosity_log"`
	StarSpectralType  *string  `json:"star_spectral_type"`

	DiscoveryYear   *int    `json:"discovery_year"`
	DiscoveryMethod *string `json:"discovery_method"`

	ESI               float64 `json:"esi"`
	HabitabilityIndex int     `json:"habitability_index"`
	HZStatus          string  `json:"hz_status"`
	DataCompleteness  int     `json:"data_completeness"`

	Visual Visual `json:"visual"`
}

type Visual struct {
	Version   int    `json:"version"`
	Seed      Seed   `json:"seed"`
	Archetype string `json:"archetype"`

	Palette    ColorPalette     `json:"palette"`
	Surface    SurfaceConfig    `json:"surface"`
	Atmosphere AtmosphereConfig `json:"atmosphere"`
}

type ColorPalette struct {
	Base      string `json:"base"`
	Secondary string `json:"secondary"`
	Accent    string `json:"accent"`
	Dark      string `json:"dark"`
}

type SurfaceConfig struct {
	NoiseScale       float64 `json:"noise_scale"`
	NoiseOctaves     int     `json:"noise_octaves"`
	NoisePersistence float64 `json:"noise_persistence"`

	MountainStrength float64 `json:"mountain_strength"`
	RidgeSharpness   float64 `json:"ridge_sharpness"`

	CraterDensity float64 `json:"crater_density"`
	CraterSize    float64 `json:"crater_size"`
	CraterDepth   float64 `json:"crater_depth"`

	OceanCoverage float64 `json:"ocean_coverage"`
	Roughness     float64 `json:"roughness"`
}

type AtmosphereConfig struct {
	Enabled bool `json:"enabled"`

	Color   string  `json:"color"`
	Opacity float64 `json:"opacity"`
	Glow    float64 `json:"glow"`
	Clouds  float64 `json:"clouds"`
}
