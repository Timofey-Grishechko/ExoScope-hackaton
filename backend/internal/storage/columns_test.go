package storage

import (
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
)

func TestColumnsMatch(t *testing.T) {
	vals, err := rowValues(domain.Planet{ID: "x"})
	if err != nil {
		t.Fatal(err)
	}
	if len(vals) != len(planetCols) {
		t.Fatalf("rowValues: %d значений, planetCols: %d колонок", len(vals), len(planetCols))
	}
}

func TestBuildListQuery(t *testing.T) {
	sql, args := buildListQuery(domain.PlanetFilter{Query: "50%_x", HostStar: "S", HZStatus: "inside"}, 10, 5)
	want := ` WHERE name ILIKE $1 AND host_star = $2 AND hz_status = $3` + listOrder + ` LIMIT $4 OFFSET $5`
	if got := sql[len(qListBase):]; got != want {
		t.Errorf("sql tail:\n got %q\nwant %q", got, want)
	}
	if args[0] != `%50\%\_x%` || len(args) != 5 {
		t.Errorf("args = %#v", args)
	}
	sql, args = buildListQuery(domain.PlanetFilter{}, 3, 0)
	if sql != qListBase+listOrder+` LIMIT $1 OFFSET $2` || len(args) != 2 {
		t.Errorf("empty filter: %q %v", sql, args)
	}
}
