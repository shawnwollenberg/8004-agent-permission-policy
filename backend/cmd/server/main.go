package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/api"
	"github.com/erc8004/policy-saas/internal/config"
)

func main() {
	// Load .env file if it exists
	_ = godotenv.Load()

	// Setup logger
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()
	if os.Getenv("ENVIRONMENT") == "development" {
		logger = logger.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Load config
	cfg := config.Load()
	logger.Info().Str("environment", cfg.Server.Environment).Strs("cors_origins", cfg.Server.AllowOrigins).Msg("starting server")

	// Connect to database
	ctx := context.Background()
	poolConfig, err := pgxpool.ParseConfig(cfg.Database.URL)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to parse database URL")
	}

	poolConfig.MaxConns = int32(cfg.Database.MaxOpenConns)
	poolConfig.MinConns = int32(cfg.Database.MaxIdleConns)
	poolConfig.MaxConnLifetime = cfg.Database.ConnMaxLifetime

	db, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer db.Close()

	// Verify database connection
	if err := db.Ping(ctx); err != nil {
		logger.Fatal().Err(err).Msg("failed to ping database")
	}
	logger.Info().Msg("connected to database")

	// Create server
	server := api.NewServer(cfg, db, logger)

	// Setup HTTP server
	httpServer := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      server,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Info().Str("port", cfg.Server.Port).Msg("starting HTTP server")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("failed to start server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info().Msg("shutting down server")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		logger.Fatal().Err(err).Msg("server forced to shutdown")
	}

	logger.Info().Msg("server stopped")
}
