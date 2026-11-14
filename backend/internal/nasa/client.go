package nasa

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/timofey-grishechko/exoscope/internal/domain"
)

var TapBase = "https://exoplanetarchive.ipac.caltech.edu/TAP"

// maxResponseSize ограничивает чтение ответа NASA. Полный каталог pscomppars —
// несколько мегабайт JSON; запас большой, но конечный.
const maxResponseSize = 64 << 20

// ВНИМАНИЕ: никаких SQL-комментариев («--») в запросе: fetch склеивает его в одну
// строку, и комментарий «съел» бы всё после себя, включая FROM.
const fullQuery = `
SELECT
    pl_name,
    hostname,
    pl_rade,
    pl_bmasse,
    pl_dens,
    pl_eqt,
    pl_insol,
    pl_orbsmax,
    pl_orbper,
    pl_orbeccen,
    pl_orbincl,
    pl_orblper,
    pl_orbtper,
    st_teff,
    st_rad,
    st_mass,
    st_lum,
    st_spectype,
    disc_year,
    discoverymethod
FROM pscomppars
WHERE pl_name IS NOT NULL
ORDER BY hostname, pl_name
`

type Client struct {
	http *http.Client
}

func NewClient(timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 90 * time.Second
	}

	return &Client{
		http: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) FetchAll(ctx context.Context) ([]domain.RawPlanet, error) {
	return c.fetch(ctx, fullQuery)
}

func (c *Client) FetchLatestDiscovered(
	ctx context.Context,
	n int,
) ([]domain.RawPlanet, error) {

	if n <= 0 {
		return nil, fmt.Errorf("limit must be greater than zero")
	}

	query := fmt.Sprintf(`
		SELECT TOP %d
			pl_name,
			hostname,
			pl_rade,
			pl_bmasse,
			pl_dens,
			pl_eqt,
			pl_insol,
			pl_orbsmax,
			pl_orbper,
			pl_orbeccen,
			pl_orbincl,
			pl_orblper,
			pl_orbtper,
			st_teff,
			st_rad,
			st_mass,
			st_lum,
			st_spectype,
			disc_year,
			discoverymethod
		FROM pscomppars
		WHERE pl_name IS NOT NULL
		  AND disc_year IS NOT NULL
		ORDER BY disc_year DESC, pl_name ASC
	`, n)

	return c.fetch(ctx, query)
}

func (c *Client) FetchTop(
	ctx context.Context,
	n int,
) ([]domain.RawPlanet, error) {
	return c.FetchLatestDiscovered(ctx, n)
}

func (c *Client) FetchSystem(
	ctx context.Context,
	hostname string,
) ([]domain.RawPlanet, error) {

	hostname = strings.TrimSpace(hostname)

	if hostname == "" {
		return nil, fmt.Errorf("hostname cannot be empty")
	}

	hostname = strings.ReplaceAll(hostname, "'", "''")

	query := fmt.Sprintf(`
		SELECT
			pl_name,
			hostname,
			pl_rade,
			pl_bmasse,
			pl_dens,
			pl_eqt,
			pl_insol,
			pl_orbsmax,
			pl_orbper,
			pl_orbeccen,
			pl_orbincl,
			pl_orblper,
			pl_orbtper,
			st_teff,
			st_rad,
			st_mass,
			st_lum,
			st_spectype,
			disc_year,
			discoverymethod
		FROM pscomppars
		WHERE hostname = '%s'
		ORDER BY pl_orbsmax ASC
	`, hostname)

	return c.fetch(ctx, query)
}

func (c *Client) fetch(
	ctx context.Context,
	adql string,
) ([]domain.RawPlanet, error) {

	u, err := url.Parse(TapBase + "/sync")
	if err != nil {
		return nil, fmt.Errorf("parse TAP URL: %w", err)
	}

	params := u.Query()
	params.Set("query", strings.Join(strings.Fields(adql), " "))
	params.Set("format", "json")
	u.RawQuery = params.Encode()

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		u.String(),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Exoscope/1.0")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("NASA request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(
			io.LimitReader(resp.Body, 1<<20),
		)

		return nil, fmt.Errorf(
			"NASA returned HTTP %s: %s",
			resp.Status,
			string(body),
		)
	}

	var planets []domain.RawPlanet

	decoder := json.NewDecoder(
		io.LimitReader(resp.Body, maxResponseSize),
	)

	if err := decoder.Decode(&planets); err != nil {
		return nil, fmt.Errorf(
			"decode NASA response: %w",
			err,
		)
	}

	return planets, nil
}
