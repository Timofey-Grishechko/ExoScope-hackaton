package logging

import "log/slog"

type CronLogger struct {
	logger *slog.Logger
}

func NewCronLogger(logger *slog.Logger) CronLogger {
	if logger == nil {
		logger = slog.Default()
	}
	return CronLogger{logger: logger}
}

func (l CronLogger) Info(msg string, keysAndValues ...any) {
	l.logger.Info(msg, keysAndValues...)
}

func (l CronLogger) Error(err error, msg string, keysAndValues ...any) {
	attrs := append([]any{"err", err}, keysAndValues...)
	l.logger.Error(msg, attrs...)
}
