package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const (
	WalletContextKey contextKey = "wallet"
	UserIDContextKey contextKey = "user_id"
)

func Auth(jwtSecret string, db *pgxpool.Pool) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Check for API key first
			apiKey := r.Header.Get("X-API-Key")
			if apiKey != "" {
				walletID, err := validateAPIKey(r.Context(), db, apiKey)
				if err == nil {
					ctx := context.WithValue(r.Context(), UserIDContextKey, walletID)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}

			// Check for JWT token
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")
			if tokenString == authHeader {
				http.Error(w, `{"error":"invalid authorization header format"}`, http.StatusUnauthorized)
				return
			}

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})

			if err != nil || !token.Valid {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"error":"invalid token claims"}`, http.StatusUnauthorized)
				return
			}

			walletAddress, ok := claims["wallet"].(string)
			if !ok {
				http.Error(w, `{"error":"invalid wallet in token"}`, http.StatusUnauthorized)
				return
			}

			userIDStr, ok := claims["sub"].(string)
			if !ok {
				http.Error(w, `{"error":"invalid user id in token"}`, http.StatusUnauthorized)
				return
			}

			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				http.Error(w, `{"error":"invalid user id format"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), WalletContextKey, walletAddress)
			ctx = context.WithValue(ctx, UserIDContextKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func validateAPIKey(ctx context.Context, db *pgxpool.Pool, key string) (uuid.UUID, error) {
	var walletID uuid.UUID
	err := db.QueryRow(ctx,
		`SELECT wallet_id FROM api_keys WHERE key_hash = encode(sha256($1::bytea), 'hex') AND revoked_at IS NULL`,
		key,
	).Scan(&walletID)
	return walletID, err
}

func GetWallet(ctx context.Context) string {
	wallet, _ := ctx.Value(WalletContextKey).(string)
	return wallet
}

func GetUserID(ctx context.Context) uuid.UUID {
	userID, _ := ctx.Value(UserIDContextKey).(uuid.UUID)
	return userID
}
