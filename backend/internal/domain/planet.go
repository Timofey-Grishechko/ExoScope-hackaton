package domain

type Planet struct {
	ID                string   `json:"id"`
	Name              string   `json:"name"`
	HostStar          string   `json:"host_star"`
	RadiusEarth       *float64 `json:"radius_earth"`
	MassEarth         *float64 `json:"mass_earth"`
	EqTempK           *float64 `json:"eq_temp_k"`
	ESI               float64  `json:"esi"`
	HabitabilityIndex int      `json:"habitability_index"`
	HZStatus          string   `json:"hz_status"`
	DataCompleteness  int      `json:"data_completeness"`
	DiscoveryYear     *int     `json:"discovery_year"`

	Visual Visual `json:"visual"`
}

type Visual struct {
	Version   int    `json:"version"`
	Seed      uint64 `json:"seed"`
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
