package policy

import (
	"time"

	"github.com/google/uuid"
)

// Definition represents a policy's rule set
type Definition struct {
	Actions     []string           `json:"actions"`
	Assets      Assets             `json:"assets,omitempty"`
	Constraints Constraints        `json:"constraints,omitempty"`
	Duration    Duration           `json:"duration,omitempty"`
	Conditions  []Condition        `json:"conditions,omitempty"`
}

// Assets defines which tokens/protocols are allowed
type Assets struct {
	Tokens    []string `json:"tokens,omitempty"`
	Protocols []string `json:"protocols,omitempty"`
	Chains    []int64  `json:"chains,omitempty"`
}

// Constraints define limits on actions
type Constraints struct {
	MaxValuePerTx   string `json:"maxValuePerTx,omitempty"`
	MaxDailyVolume  string `json:"maxDailyVolume,omitempty"`
	MaxWeeklyVolume string `json:"maxWeeklyVolume,omitempty"`
	MaxTxCount      int    `json:"maxTxCount,omitempty"`
	RequireApproval bool   `json:"requireApproval,omitempty"`
}

// Duration defines validity period
type Duration struct {
	ValidFrom  *time.Time `json:"validFrom,omitempty"`
	ValidUntil *time.Time `json:"validUntil,omitempty"`
}

// Condition represents additional rule conditions
type Condition struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
}

// Action represents an action being validated
type Action struct {
	Type     string                 `json:"type"`
	Token    string                 `json:"token,omitempty"`
	Protocol string                 `json:"protocol,omitempty"`
	Amount   string                 `json:"amount,omitempty"`
	Chain    int64                  `json:"chain,omitempty"`
	To       string                 `json:"to,omitempty"`
	Data     map[string]interface{} `json:"data,omitempty"`
}

// ValidationResult is the result of validating an action
type ValidationResult struct {
	Allowed      bool
	Reason       string
	PermissionID *uuid.UUID
	PolicyID     *uuid.UUID
	Constraints  map[string]interface{}
}

// SimulationResult is the result of simulating an action
type SimulationResult struct {
	WouldAllow      bool
	Reason          string
	MatchingPolicy  *uuid.UUID
	CurrentUsage    map[string]interface{}
	RemainingQuota  map[string]interface{}
	Recommendations []string
}

// ValidActions lists all valid action types
var ValidActions = map[string]bool{
	"swap":       true,
	"transfer":   true,
	"approve":    true,
	"stake":      true,
	"unstake":    true,
	"deposit":    true,
	"withdraw":   true,
	"mint":       true,
	"burn":       true,
	"bridge":     true,
	"claim":      true,
	"vote":       true,
	"delegate":   true,
	"lp_add":     true,
	"lp_remove":  true,
	"borrow":     true,
	"repay":      true,
	"liquidate":  true,
	"*":          true, // wildcard for all actions
}

// ValidOperators for conditions
var ValidOperators = map[string]bool{
	"eq":       true,
	"ne":       true,
	"gt":       true,
	"gte":      true,
	"lt":       true,
	"lte":      true,
	"in":       true,
	"not_in":   true,
	"contains": true,
	"regex":    true,
}
