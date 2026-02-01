package policy

import (
	"context"
	"encoding/json"
	"errors"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rs/zerolog"
)

type Engine struct {
	db     *pgxpool.Pool
	logger zerolog.Logger
}

func NewEngine(db *pgxpool.Pool, logger zerolog.Logger) *Engine {
	return &Engine{
		db:     db,
		logger: logger,
	}
}

// ValidateDefinition validates a policy definition
func (e *Engine) ValidateDefinition(def *Definition) error {
	if def == nil {
		return errors.New("definition is required")
	}

	if len(def.Actions) == 0 {
		return errors.New("at least one action is required")
	}

	for _, action := range def.Actions {
		if !ValidActions[strings.ToLower(action)] {
			return errors.New("invalid action: " + action)
		}
	}

	// Validate constraints
	if def.Constraints.MaxValuePerTx != "" {
		if _, ok := new(big.Int).SetString(def.Constraints.MaxValuePerTx, 10); !ok {
			return errors.New("maxValuePerTx must be a valid integer")
		}
	}
	if def.Constraints.MaxDailyVolume != "" {
		if _, ok := new(big.Int).SetString(def.Constraints.MaxDailyVolume, 10); !ok {
			return errors.New("maxDailyVolume must be a valid integer")
		}
	}
	if def.Constraints.MaxWeeklyVolume != "" {
		if _, ok := new(big.Int).SetString(def.Constraints.MaxWeeklyVolume, 10); !ok {
			return errors.New("maxWeeklyVolume must be a valid integer")
		}
	}

	// Validate conditions
	for _, cond := range def.Conditions {
		if !ValidOperators[cond.Operator] {
			return errors.New("invalid operator: " + cond.Operator)
		}
	}

	// Validate duration
	if def.Duration.ValidFrom != nil && def.Duration.ValidUntil != nil {
		if def.Duration.ValidUntil.Before(*def.Duration.ValidFrom) {
			return errors.New("validUntil must be after validFrom")
		}
	}

	return nil
}

// Validate checks if an action is allowed for an agent
func (e *Engine) Validate(ctx context.Context, walletID, agentID uuid.UUID, action Action) ValidationResult {
	// Find active permissions for this agent
	rows, err := e.db.Query(ctx,
		`SELECT p.id, p.policy_id, pol.definition, p.valid_from, p.valid_until
		 FROM permissions p
		 JOIN policies pol ON p.policy_id = pol.id
		 WHERE p.wallet_id = $1 AND p.agent_id = $2 AND p.status = 'active'
		 AND pol.status = 'active'
		 AND p.valid_from <= NOW()
		 AND (p.valid_until IS NULL OR p.valid_until > NOW())`,
		walletID, agentID,
	)
	if err != nil {
		e.logger.Error().Err(err).Msg("failed to query permissions")
		return ValidationResult{
			Allowed: false,
			Reason:  "internal error",
		}
	}
	defer rows.Close()

	for rows.Next() {
		var permID, policyID uuid.UUID
		var defBytes []byte
		var validFrom time.Time
		var validUntil *time.Time

		if err := rows.Scan(&permID, &policyID, &defBytes, &validFrom, &validUntil); err != nil {
			continue
		}

		var def Definition
		if err := json.Unmarshal(defBytes, &def); err != nil {
			continue
		}

		// Check if action matches policy
		if e.matchesPolicy(&def, &action, walletID, agentID, ctx) {
			return ValidationResult{
				Allowed:      true,
				PermissionID: &permID,
				PolicyID:     &policyID,
				Constraints: map[string]interface{}{
					"maxValuePerTx":   def.Constraints.MaxValuePerTx,
					"maxDailyVolume":  def.Constraints.MaxDailyVolume,
					"requireApproval": def.Constraints.RequireApproval,
				},
			}
		}
	}

	return ValidationResult{
		Allowed: false,
		Reason:  "no matching policy found for this action",
	}
}

// matchesPolicy checks if an action matches a policy definition
func (e *Engine) matchesPolicy(def *Definition, action *Action, walletID, agentID uuid.UUID, ctx context.Context) bool {
	// Check action type
	actionAllowed := false
	for _, a := range def.Actions {
		if a == "*" || strings.EqualFold(a, action.Type) {
			actionAllowed = true
			break
		}
	}
	if !actionAllowed {
		return false
	}

	// Check assets
	if len(def.Assets.Tokens) > 0 && action.Token != "" {
		tokenAllowed := false
		for _, t := range def.Assets.Tokens {
			if strings.EqualFold(t, action.Token) || t == "*" {
				tokenAllowed = true
				break
			}
		}
		if !tokenAllowed {
			return false
		}
	}

	if len(def.Assets.Protocols) > 0 && action.Protocol != "" {
		protocolAllowed := false
		for _, p := range def.Assets.Protocols {
			if strings.EqualFold(p, action.Protocol) || p == "*" {
				protocolAllowed = true
				break
			}
		}
		if !protocolAllowed {
			return false
		}
	}

	if len(def.Assets.Chains) > 0 && action.Chain != 0 {
		chainAllowed := false
		for _, c := range def.Assets.Chains {
			if c == action.Chain {
				chainAllowed = true
				break
			}
		}
		if !chainAllowed {
			return false
		}
	}

	// Check constraints
	if action.Amount != "" {
		amount, ok := new(big.Int).SetString(action.Amount, 10)
		if !ok {
			return false
		}

		// Check max value per tx
		if def.Constraints.MaxValuePerTx != "" {
			maxValue, _ := new(big.Int).SetString(def.Constraints.MaxValuePerTx, 10)
			if amount.Cmp(maxValue) > 0 {
				return false
			}
		}

		// Check daily volume
		if def.Constraints.MaxDailyVolume != "" {
			maxDaily, _ := new(big.Int).SetString(def.Constraints.MaxDailyVolume, 10)
			dailyUsage := e.getDailyUsage(ctx, walletID, agentID)
			totalAfter := new(big.Int).Add(dailyUsage, amount)
			if totalAfter.Cmp(maxDaily) > 0 {
				return false
			}
		}
	}

	// Check conditions
	for _, cond := range def.Conditions {
		if !e.evaluateCondition(&cond, action) {
			return false
		}
	}

	return true
}

// getDailyUsage calculates the total volume used today
func (e *Engine) getDailyUsage(ctx context.Context, walletID, agentID uuid.UUID) *big.Int {
	var totalStr string
	err := e.db.QueryRow(ctx,
		`SELECT COALESCE(SUM((action_data->>'amount')::numeric), 0)::text
		 FROM validation_requests
		 WHERE wallet_id = $1 AND agent_id = $2 AND allowed = true
		 AND created_at >= CURRENT_DATE`,
		walletID, agentID,
	).Scan(&totalStr)
	if err != nil {
		return big.NewInt(0)
	}

	total, _ := new(big.Int).SetString(totalStr, 10)
	if total == nil {
		return big.NewInt(0)
	}
	return total
}

// evaluateCondition evaluates a single condition against an action
func (e *Engine) evaluateCondition(cond *Condition, action *Action) bool {
	var fieldValue interface{}

	switch cond.Field {
	case "type":
		fieldValue = action.Type
	case "token":
		fieldValue = action.Token
	case "protocol":
		fieldValue = action.Protocol
	case "amount":
		fieldValue = action.Amount
	case "chain":
		fieldValue = action.Chain
	case "to":
		fieldValue = action.To
	default:
		if action.Data != nil {
			fieldValue = action.Data[cond.Field]
		}
	}

	switch cond.Operator {
	case "eq":
		return fieldValue == cond.Value
	case "ne":
		return fieldValue != cond.Value
	case "gt":
		return compareNumeric(fieldValue, cond.Value) > 0
	case "gte":
		return compareNumeric(fieldValue, cond.Value) >= 0
	case "lt":
		return compareNumeric(fieldValue, cond.Value) < 0
	case "lte":
		return compareNumeric(fieldValue, cond.Value) <= 0
	case "in":
		if values, ok := cond.Value.([]interface{}); ok {
			for _, v := range values {
				if fieldValue == v {
					return true
				}
			}
		}
		return false
	case "not_in":
		if values, ok := cond.Value.([]interface{}); ok {
			for _, v := range values {
				if fieldValue == v {
					return false
				}
			}
		}
		return true
	case "contains":
		if str, ok := fieldValue.(string); ok {
			if substr, ok := cond.Value.(string); ok {
				return strings.Contains(str, substr)
			}
		}
		return false
	}

	return false
}

func compareNumeric(a, b interface{}) int {
	aVal := toBigInt(a)
	bVal := toBigInt(b)
	if aVal == nil || bVal == nil {
		return 0
	}
	return aVal.Cmp(bVal)
}

func toBigInt(v interface{}) *big.Int {
	switch val := v.(type) {
	case string:
		i, _ := new(big.Int).SetString(val, 10)
		return i
	case int64:
		return big.NewInt(val)
	case float64:
		return big.NewInt(int64(val))
	case int:
		return big.NewInt(int64(val))
	default:
		return nil
	}
}

// Simulate simulates an action without recording it
func (e *Engine) Simulate(ctx context.Context, walletID, agentID uuid.UUID, action Action) SimulationResult {
	result := e.Validate(ctx, walletID, agentID, action)

	var currentUsage map[string]interface{}
	var remainingQuota map[string]interface{}
	var recommendations []string

	if result.PolicyID != nil {
		// Get current usage stats
		dailyUsage := e.getDailyUsage(ctx, walletID, agentID)
		currentUsage = map[string]interface{}{
			"daily": dailyUsage.String(),
		}

		// Calculate remaining quota if we have constraint info
		if result.Constraints != nil {
			if maxDaily, ok := result.Constraints["maxDailyVolume"].(string); ok && maxDaily != "" {
				maxDailyInt, _ := new(big.Int).SetString(maxDaily, 10)
				remaining := new(big.Int).Sub(maxDailyInt, dailyUsage)
				remainingQuota = map[string]interface{}{
					"daily": remaining.String(),
				}
			}
		}
	} else {
		recommendations = append(recommendations, "Create a policy that allows this action type")
		recommendations = append(recommendations, "Grant permission to the agent with an active policy")
	}

	return SimulationResult{
		WouldAllow:      result.Allowed,
		Reason:          result.Reason,
		MatchingPolicy:  result.PolicyID,
		CurrentUsage:    currentUsage,
		RemainingQuota:  remainingQuota,
		Recommendations: recommendations,
	}
}
