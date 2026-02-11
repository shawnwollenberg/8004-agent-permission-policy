package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Server     ServerConfig
	Database   DatabaseConfig
	Blockchain BlockchainConfig
	JWT        JWTConfig
}

type ServerConfig struct {
	Port         string
	Environment  string
	AllowOrigins []string
}

type DatabaseConfig struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

type BlockchainConfig struct {
	RPCURL                       string
	ChainID                      int64
	IdentityRegistryAddress      string
	PolicyRegistryAddress        string
	SmartAccountFactoryAddress   string
	EntryPointAddress            string
	PermissionEnforcerAddress    string
}

type JWTConfig struct {
	Secret     string
	Expiration time.Duration
}

func Load() *Config {
	// Parse CORS origins - supports comma-separated values
	corsOrigin := getEnv("CORS_ORIGIN", "http://localhost:3000")
	var origins []string
	for _, o := range strings.Split(corsOrigin, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	return &Config{
		Server: ServerConfig{
			Port:         getEnv("PORT", "8080"),
			Environment:  getEnv("ENVIRONMENT", "development"),
			AllowOrigins: origins,
		},
		Database: DatabaseConfig{
			URL:             getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/erc8004?sslmode=disable"),
			MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
			ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MINS", 5)) * time.Minute,
		},
		Blockchain: BlockchainConfig{
			RPCURL:                       getEnv("RPC_URL", "http://localhost:8545"),
			ChainID:                      int64(getEnvInt("CHAIN_ID", 31337)),
			IdentityRegistryAddress:      getEnv("IDENTITY_REGISTRY_ADDRESS", ""),
			PolicyRegistryAddress:        getEnv("POLICY_REGISTRY_ADDRESS", ""),
			SmartAccountFactoryAddress:   getEnv("SMART_ACCOUNT_FACTORY_ADDRESS", ""),
			EntryPointAddress:            getEnv("ENTRY_POINT_ADDRESS", "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"),
			PermissionEnforcerAddress:    getEnv("PERMISSION_ENFORCER_ADDRESS", ""),
		},
		JWT: JWTConfig{
			Secret:     getEnv("JWT_SECRET", "your-secret-key-change-in-production"),
			Expiration: time.Duration(getEnvInt("JWT_EXPIRATION_HOURS", 24)) * time.Hour,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}
