package transform

import (
	"math"
	"regexp"
	"strings"

	"github.com/timofey-grishechko/exoscope/backend/internal/domain"
)

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func Enrich(raw domain.RawPlanet) domain.Planet {
	p := domain.Planet{
		ID:            slugify(raw.Name),
		Name:          raw.Name,
		HostStar:      raw.HostName,
		RadiusEarth:   raw.RadiusEarth,
		MassEarth:     raw.MassEarth,
		EqTempK:       raw.EqTempK,
		DiscoveryYear: raw.DiscoveryYear,
	}

	switch {
	case raw.EqTempK == nil:
		p.HZStatus = "unknown"
	case *raw.EqTempK > 310:
		p.HZStatus = "hot"
	case *raw.EqTempK < 180:
		p.HZStatus = "cold"
	default:
		p.HZStatus = "in"
	}

	if raw.RadiusEarth != nil && raw.EqTempK != nil {
		simR := similarity(*raw.RadiusEarth, 1.0)
		simT := similarity(*raw.EqTempK, 288.0)
		p.ESI = math.Sqrt(simR * simT)
	}

	mult := 0.1
	switch p.HZStatus {
	case "in":
		mult = 1.0
	case "hot", "cold":
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
	for _, r := range raws {
		out = append(out, Enrich(r))
	}
	return out
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
