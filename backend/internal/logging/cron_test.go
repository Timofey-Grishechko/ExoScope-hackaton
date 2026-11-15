package logging_test

import (
	"bytes"
	"errors"
	"log/slog"
	"strings"
	"testing"

	"github.com/timofey-grishechko/exoscope/internal/logging"
)

func TestCronLogger(t *testing.T) {
	var buf bytes.Buffer
	handler := slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})
	logger := slog.New(handler)

	cronLog := logging.NewCronLogger(logger)

	cronLog.Info("test info", "key", "value")
	if !strings.Contains(buf.String(), "test info") {
		t.Error("expected 'test info' in logs")
	}

	buf.Reset()
	cronLog.Error(errors.New("test error"), "something failed")
	logOutput := buf.String()

	if !strings.Contains(logOutput, "something failed") {
		t.Error("expected 'something failed' in logs")
	}
	if !strings.Contains(logOutput, "test error") {
		t.Error("expected error message in logs")
	}
}
