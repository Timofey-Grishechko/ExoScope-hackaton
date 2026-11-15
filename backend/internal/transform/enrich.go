package transform

import (
	"math"
	"regexp"
	"strings"

	"github.com/timofey-grishechko/exoscope/internal/domain"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func Enrich(raw domain.RawPlanet) domain.Planet {
	raw = sanitize(raw)

	p := domain.Planet{
		ID:       slugify(raw.Name),
		Name:     raw.Name,
		HostStar: raw.HostName,

		RadiusEarth: raw.RadiusEarth,
		MassEarth:   raw.MassEarth,
		Density:     raw.Density,
		EqTempK:     raw.EqTempK,
		Insolation:  raw.Insolation,

		SemiMajorAxisAU:       raw.SemiMajorAxisAU,
		OrbitalPeriodDays:     raw.OrbitalPeriod,
		Eccentricity:          raw.Eccentricity,
		InclinationDeg:        raw.InclinationDeg,
		ArgumentPeriastronDeg: raw.ArgumentPeriastronDeg,
		PeriastronTimeJD:      raw.PeriastronTimeJD,

		StarTempK:         raw.StarTempK,
		StarRadiusSolar:   raw.StarRadiusSolar,
		StarMassSolar:     raw.StarMassSolar,
		StarLuminosityLog: raw.StarLuminosityLog,
		StarSpectralType:  raw.StarSpectralType,

		DiscoveryYear:   raw.DiscoveryYear,
		DiscoveryMethod: raw.DiscoveryMethod,
	}

	switch {
	case raw.EqTempK == nil:
		p.HZStatus = domain.HZUnknown
	case *raw.EqTempK > 310:
		p.HZStatus = domain.HZTooHot
	case *raw.EqTempK < 180:
		p.HZStatus = domain.HZTooCold
	default:
		p.HZStatus = domain.HZInside
	}

	if raw.RadiusEarth != nil && raw.EqTempK != nil {
		simR := similarity(*raw.RadiusEarth, 1.0)
		simT := similarity(*raw.EqTempK, 288.0)
		p.ESI = math.Sqrt(simR * simT)
	}

	mult := 0.1
	switch p.HZStatus {
	case domain.HZInside:
		mult = 1.0
	case domain.HZTooHot, domain.HZTooCold:
		mult = 0.3
	}
	p.HabitabilityIndex = int(math.Round(p.ESI * 100 * mult))

	known := 0
	if raw.RadiusEarth != nil {
		known++
	}
	if raw.MassEarth != nil {
		known++
	}
	if raw.EqTempK != nil {
		known++
	}
	if raw.DiscoveryYear != nil {
		known++
	}
	p.DataCompleteness = known * 100 / 4

	return p
}

func EnrichBatch(raws []domain.RawPlanet) []domain.Planet {
	out := make([]domain.Planet, 0, len(raws))
	seen := make(map[string]int, len(raws))
	for _, r := range raws {
		p := Enrich(r)
		if p.ID == "" || p.HostStar == "" {
			continue
		}
		if i, dup := seen[p.ID]; dup {
			out[i] = p // последняя запись побеждает
			continue
		}
		seen[p.ID] = len(out)
		out = append(out, p)
	}
	return out
}

func sanitize(r domain.RawPlanet) domain.RawPlanet {
	pos := func(v *float64) *float64 {
		if v == nil || math.IsNaN(*v) || math.IsInf(*v, 0) || *v <= 0 {
			return nil
		}
		return v
	}
	inRange := func(v *float64, lo, hi float64) *float64 {
		if v == nil || math.IsNaN(*v) || *v < lo || *v > hi {
			return nil
		}
		return v
	}
	r.Name = strings.TrimSpace(r.Name)
	r.HostName = strings.TrimSpace(r.HostName)

	r.RadiusEarth = pos(r.RadiusEarth)
	r.MassEarth = pos(r.MassEarth)
	r.Density = pos(r.Density)
	r.EqTempK = pos(r.EqTempK)
	r.Insolation = inRange(r.Insolation, 0, math.MaxFloat64)
	r.SemiMajorAxisAU = pos(r.SemiMajorAxisAU)
	r.OrbitalPeriod = pos(r.OrbitalPeriod)
	r.Eccentricity = inRange(r.Eccentricity, 0, 1)
	r.InclinationDeg = inRange(r.InclinationDeg, 0, 180)
	r.StarTempK = pos(r.StarTempK)
	r.StarRadiusSolar = pos(r.StarRadiusSolar)
	r.StarMassSolar = pos(r.StarMassSolar)
	if r.DiscoveryYear != nil && (*r.DiscoveryYear < 1800 || *r.DiscoveryYear > 32767) {
		r.DiscoveryYear = nil
	}
	return r
}

func similarity(x, earth float64) float64 {
	if x+earth == 0 {
		return 0
	}
	return 1 - math.Abs(x-earth)/(x+earth)
}

func slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = slugRe.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}
