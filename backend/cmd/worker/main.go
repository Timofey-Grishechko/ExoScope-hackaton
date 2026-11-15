package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/timofey-grishechko/exoscope/internal/ingest"
	"github.com/timofey-grishechko/exoscope/internal/logging"
	"github.com/timofey-grishechko/exoscope/internal/nasa"
	"github.com/timofey-grishechko/exoscope/internal/storage"
)

func main() {
	once := flag.Bool("once", false, "run one sync and exit")
	flag.Parse()

	log := slog.New(slog.NewTextHandler(os.Stdout, nil))

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	db, err := storage.Connect(ctx, dsn)
	if err != nil {
		log.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	nasaClient := nasa.NewClient(2 * time.Minute)
	svc := ingest.New(nasaClient, db, log)

	if *once {
		syncCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
		defer cancel()
		if err := svc.Run(syncCtx); err != nil {
			log.Error("sync failed", "err", err)
			os.Exit(1)
		}
		log.Info("sync completed")
		return
	}

	cronLog := logging.NewCronLogger(log)
	c := cron.New(cron.WithChain(
		cron.Recover(cronLog),
		cron.SkipIfStillRunning(cronLog),
	))
	_, err = c.AddFunc("CRON_TZ=UTC 0 3 * * 1", func() {
		syncCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()
		if err := svc.Run(syncCtx); err != nil {
			log.Error("sync failed", "err", err)
			return
		}
		log.Info("sync completed")
	})
	if err != nil {
		log.Error("cron registration failed", "err", err)
		os.Exit(1)
	}

	c.Start()
	log.Info("worker started, waiting for schedule")
	<-ctx.Done()

	stopCtx := c.Stop()
	<-stopCtx.Done()
	log.Info("worker stopped")
}
