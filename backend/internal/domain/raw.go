package domain

type RawPlanet struct {
	Name     string `json:"pl_name"`
	HostName string `json:"hostname"`

	RadiusEarth *float64 `json:"pl_rade"`
	MassEarth   *float64 `json:"pl_bmasse"`
	Density     *float64 `json:"pl_dens"`
	EqTempK     *float64 `json:"pl_eqt"`
	Insolation  *float64 `json:"pl_insol"`

	SemiMajorAxisAU *float64 `json:"pl_orbsmax"`
	OrbitalPeriod   *float64 `json:"pl_orbper"`
	Eccentricity    *float64 `json:"pl_orbeccen"`
	InclinationDeg  *float64 `json:"pl_orbincl"`

	ArgumentPeriastronDeg *float64 `json:"pl_orblper"`
	PeriastronTimeJD      *float64 `json:"pl_orbtper"`

	StarTempK         *float64 `json:"st_teff"`
	StarRadiusSolar   *float64 `json:"st_rad"`
	StarMassSolar     *float64 `json:"st_mass"`
	StarLuminosityLog *float64 `json:"st_lum"`
	StarSpectralType  *string  `json:"st_spectype"`

	DiscoveryYear   *int    `json:"disc_year"`
	DiscoveryMethod *string `json:"discoverymethod"`
}
