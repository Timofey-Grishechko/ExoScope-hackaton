package domain_test

import (
	"encoding/json"
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/domain"
)

func TestSeedJSON(t *testing.T) {
	const big = 14852022748117205511

	b, err := json.Marshal(domain.Visual{Seed: big})
	if err != nil {
		t.Fatal(err)
	}
	var raw map[string]any
	_ = json.Unmarshal(b, &raw)
	if raw["seed"] != "14852022748117205511" {
		t.Errorf("seed должен сериализоваться строкой без потери точности, got %v", raw["seed"])
	}

	for _, in := range []string{`{"seed":"14852022748117205511"}`, `{"seed":14852022748117205511}`} {
		var v domain.Visual
		if err := json.Unmarshal([]byte(in), &v); err != nil || v.Seed != big {
			t.Errorf("%s -> %v, err=%v", in, v.Seed, err)
		}
	}
}
