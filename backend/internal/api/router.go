package api

import (
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"

	"github.com/erc8004/policy-saas/internal/api/handlers"
	customMiddleware "github.com/erc8004/policy-saas/internal/api/middleware"
	"github.com/erc8004/policy-saas/internal/config"
)

type Server struct {
	router   *chi.Mux
	config   *config.Config
	db       *pgxpool.Pool
	logger   zerolog.Logger
	handlers *handlers.Handlers
}

func NewServer(cfg *config.Config, db *pgxpool.Pool, logger zerolog.Logger) *Server {
	s := &Server{
		router:   chi.NewRouter(),
		config:   cfg,
		db:       db,
		logger:   logger,
		handlers: handlers.New(db, logger, cfg),
	}
	s.setupMiddleware()
	s.setupRoutes()
	return s
}

func (s *Server) setupMiddleware() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(customMiddleware.Logger(s.logger))
	s.router.Use(middleware.Recoverer)
	s.router.Use(middleware.Timeout(60 * time.Second))

	s.router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.config.Server.AllowOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-API-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
}

func (s *Server) setupRoutes() {
	s.router.Get("/health", s.handlers.Health)

	s.router.Route("/api/v1", func(r chi.Router) {
		// Auth routes (public)
		r.Route("/auth", func(r chi.Router) {
			r.Post("/nonce", s.handlers.GenerateNonce)
			r.Post("/verify", s.handlers.VerifySignature)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(customMiddleware.Auth(s.config.JWT.Secret, s.db))

			// API Keys
			r.Route("/api-keys", func(r chi.Router) {
				r.Post("/", s.handlers.CreateAPIKey)
				r.Get("/", s.handlers.ListAPIKeys)
				r.Delete("/{id}", s.handlers.DeleteAPIKey)
			})

			// Agents
			r.Route("/agents", func(r chi.Router) {
				r.Post("/", s.handlers.CreateAgent)
				r.Get("/", s.handlers.ListAgents)
				r.Get("/{id}", s.handlers.GetAgent)
				r.Patch("/{id}", s.handlers.UpdateAgent)
				r.Delete("/{id}", s.handlers.DeleteAgent)
				r.Post("/{id}/register-onchain", s.handlers.RegisterAgentOnchain)
				r.Post("/{id}/deploy-smart-account", s.handlers.DeploySmartAccount)
				r.Get("/{id}/smart-account", s.handlers.GetSmartAccount)
				r.Post("/{id}/upgrade-to-smart-account", s.handlers.UpgradeToSmartAccount)
			})

			// Policies
			r.Route("/policies", func(r chi.Router) {
				r.Post("/", s.handlers.CreatePolicy)
				r.Get("/", s.handlers.ListPolicies)
				r.Get("/{id}", s.handlers.GetPolicy)
				r.Put("/{id}", s.handlers.UpdatePolicy)
				r.Delete("/{id}", s.handlers.DeletePolicy)
				r.Post("/{id}/activate", s.handlers.ActivatePolicy)
				r.Post("/{id}/revoke", s.handlers.RevokePolicy)
			})

			// Permissions
			r.Route("/permissions", func(r chi.Router) {
				r.Post("/", s.handlers.CreatePermission)
				r.Get("/", s.handlers.ListPermissions)
				r.Get("/{id}", s.handlers.GetPermission)
				r.Delete("/{id}", s.handlers.DeletePermission)
				r.Post("/{id}/mint", s.handlers.MintPermission)
			})

			// Validation (Core Product)
			r.Route("/validate", func(r chi.Router) {
				r.Post("/", s.handlers.ValidateAction)
				r.Post("/batch", s.handlers.ValidateBatch)
				r.Post("/simulate", s.handlers.SimulateAction)
			})

			// Audit
			r.Route("/audit", func(r chi.Router) {
				r.Get("/", s.handlers.ListAuditLogs)
				r.Get("/export", s.handlers.ExportAuditLogs)
			})

			// Webhooks
			r.Route("/webhooks", func(r chi.Router) {
				r.Post("/", s.handlers.CreateWebhook)
				r.Get("/", s.handlers.ListWebhooks)
				r.Get("/{id}", s.handlers.GetWebhook)
				r.Patch("/{id}", s.handlers.UpdateWebhook)
				r.Delete("/{id}", s.handlers.DeleteWebhook)
			})
		})
	})
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}
