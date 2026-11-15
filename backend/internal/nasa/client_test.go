package nasa_test

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/timofey-grishechko/exoscope/internal/nasa"
)

func TestFetchTop(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/sync" {
			t.Errorf("unexpected path: got %s, want /sync", r.URL.Path)
		}

		if r.URL.Query().Get("format") != "json" {
			t.Errorf("expected format=json")
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		fmt.Fprint(w, `[{"pl_name": "Test 1", "hostname": "Host 1"}]`)
	}))
	defer server.Close()

	originalBase := nasa.TapBase
	nasa.TapBase = server.URL

	t.Cleanup(func() {
		nasa.TapBase = originalBase
	})

	client := nasa.NewClient(5 * time.Second)
	planets, err := client.FetchTop(context.Background(), 1)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(planets) != 1 {
		t.Fatalf("expected 1 planet, got %d", len(planets))
	}

	if planets[0].Name != "Test 1" {
		t.Errorf("expected planet name 'Test 1', got '%s'", planets[0].Name)
	}

	if planets[0].HostName != "Host 1" {
		t.Errorf("expected host name 'Host 1', got '%s'", planets[0].HostName)
	}
}

// Регрессия: SQL-комментарии в запросе после склейки в одну строку скрывали FROM,
// и NASA отвечал «No table name found in ADQL query».
func TestFetchAll_QueryIsSingleLineSafe(t *testing.T) {
	var gotQuery string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.Query().Get("query")
		fmt.Fprint(w, `[]`)
	}))
	defer server.Close()

	originalBase := nasa.TapBase
	nasa.TapBase = server.URL
	t.Cleanup(func() { nasa.TapBase = originalBase })

	if _, err := nasa.NewClient(5 * time.Second).FetchAll(context.Background()); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(gotQuery, "--") {
		t.Errorf("в запросе остались SQL-комментарии: %s", gotQuery)
	}
	if !strings.Contains(gotQuery, "FROM pscomppars") {
		t.Errorf("в запросе нет FROM pscomppars: %s", gotQuery)
	}
	if strings.Contains(gotQuery, "TOP") {
		t.Errorf("полный запрос не должен быть ограничен TOP: %s", gotQuery)
	}
}
