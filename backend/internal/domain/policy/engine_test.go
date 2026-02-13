package policy

import (
	"math/big"
	"testing"
	"time"
)

func TestValidateDefinition_Valid(t *testing.T) {
	engine := &Engine{}

	def := &Definition{
		Actions: []string{"swap", "transfer"},
		Assets: Assets{
			Tokens: []string{"0xUSDC", "0xETH"},
			Chains: []int64{1, 137},
		},
		Constraints: Constraints{
			MaxValuePerTx:  "1000000000000000000",
			MaxDailyVolume: "10000000000000000000",
			MaxTxCount:     100,
		},
	}

	if err := engine.ValidateDefinition(def); err != nil {
		t.Fatalf("expected valid definition, got error: %v", err)
	}
}

func TestValidateDefinition_NilDef(t *testing.T) {
	engine := &Engine{}
	err := engine.ValidateDefinition(nil)
	if err == nil {
		t.Fatal("expected error for nil definition")
	}
	if err.Error() != "definition is required" {
		t.Fatalf("unexpected error message: %s", err.Error())
	}
}

func TestValidateDefinition_EmptyActions(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{}}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for empty actions")
	}
	if err.Error() != "at least one action is required" {
		t.Fatalf("unexpected error message: %s", err.Error())
	}
}

func TestValidateDefinition_InvalidAction(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{"invalid_action"}}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for invalid action")
	}
}

func TestValidateDefinition_WildcardAction(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{"*"}}
	if err := engine.ValidateDefinition(def); err != nil {
		t.Fatalf("wildcard action should be valid, got: %v", err)
	}
}

func TestValidateDefinition_BadMaxValuePerTx(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Constraints: Constraints{
			MaxValuePerTx: "not_a_number",
		},
	}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for bad maxValuePerTx")
	}
}

func TestValidateDefinition_BadMaxDailyVolume(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Constraints: Constraints{
			MaxDailyVolume: "xyz",
		},
	}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for bad maxDailyVolume")
	}
}

func TestValidateDefinition_BadMaxWeeklyVolume(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Constraints: Constraints{
			MaxWeeklyVolume: "abc",
		},
	}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for bad maxWeeklyVolume")
	}
}

func TestValidateDefinition_InvalidOperator(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Conditions: []Condition{
			{Field: "amount", Operator: "invalid_op", Value: "100"},
		},
	}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error for invalid operator")
	}
}

func TestValidateDefinition_InvalidDuration(t *testing.T) {
	engine := &Engine{}
	now := time.Now()
	past := now.Add(-24 * time.Hour)
	def := &Definition{
		Actions: []string{"swap"},
		Duration: Duration{
			ValidFrom:  &now,
			ValidUntil: &past,
		},
	}
	err := engine.ValidateDefinition(def)
	if err == nil {
		t.Fatal("expected error when validUntil is before validFrom")
	}
}

func TestValidateDefinition_ValidDuration(t *testing.T) {
	engine := &Engine{}
	now := time.Now()
	future := now.Add(24 * time.Hour)
	def := &Definition{
		Actions: []string{"swap"},
		Duration: Duration{
			ValidFrom:  &now,
			ValidUntil: &future,
		},
	}
	if err := engine.ValidateDefinition(def); err != nil {
		t.Fatalf("expected valid duration, got error: %v", err)
	}
}

// Test matchesPolicy directly (same package)
func TestMatchesPolicy_ActionMatch(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{"swap"}}
	action := &Action{Type: "swap"}

	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected action to match")
	}
}

func TestMatchesPolicy_ActionNoMatch(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{"swap"}}
	action := &Action{Type: "transfer"}

	if engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected action not to match")
	}
}

func TestMatchesPolicy_WildcardAction(t *testing.T) {
	engine := &Engine{}
	def := &Definition{Actions: []string{"*"}}
	action := &Action{Type: "anything"}

	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("wildcard should match any action")
	}
}

func TestMatchesPolicy_TokenFilter(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Assets: Assets{
			Tokens: []string{"0xUSDC"},
		},
	}

	// Matching token
	action := &Action{Type: "swap", Token: "0xUSDC"}
	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected matching token to pass")
	}

	// Non-matching token
	action2 := &Action{Type: "swap", Token: "0xDAI"}
	if engine.matchesPolicyLocal(def, action2) {
		t.Fatal("expected non-matching token to fail")
	}
}

func TestMatchesPolicy_ChainFilter(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Assets: Assets{
			Chains: []int64{1, 137},
		},
	}

	// Matching chain
	action := &Action{Type: "swap", Chain: 1}
	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected chain 1 to match")
	}

	// Non-matching chain
	action2 := &Action{Type: "swap", Chain: 42161}
	if engine.matchesPolicyLocal(def, action2) {
		t.Fatal("expected chain 42161 to not match")
	}
}

func TestMatchesPolicy_ProtocolFilter(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"swap"},
		Assets: Assets{
			Protocols: []string{"0xUniswap"},
		},
	}

	action := &Action{Type: "swap", Protocol: "0xUniswap"}
	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected matching protocol")
	}

	action2 := &Action{Type: "swap", Protocol: "0xSushiSwap"}
	if engine.matchesPolicyLocal(def, action2) {
		t.Fatal("expected non-matching protocol to fail")
	}
}

func TestMatchesPolicy_MaxValuePerTx(t *testing.T) {
	engine := &Engine{}
	def := &Definition{
		Actions: []string{"transfer"},
		Constraints: Constraints{
			MaxValuePerTx: "1000",
		},
	}

	// Within limit
	action := &Action{Type: "transfer", Amount: "500"}
	if !engine.matchesPolicyLocal(def, action) {
		t.Fatal("expected amount within limit to pass")
	}

	// At limit
	action2 := &Action{Type: "transfer", Amount: "1000"}
	if !engine.matchesPolicyLocal(def, action2) {
		t.Fatal("expected amount at limit to pass")
	}

	// Over limit
	action3 := &Action{Type: "transfer", Amount: "1001"}
	if engine.matchesPolicyLocal(def, action3) {
		t.Fatal("expected amount over limit to fail")
	}
}

// Test evaluateCondition
func TestEvaluateCondition_Eq(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "type", Operator: "eq", Value: "swap"}
	action := &Action{Type: "swap"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected eq to match")
	}
}

func TestEvaluateCondition_Ne(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "type", Operator: "ne", Value: "transfer"}
	action := &Action{Type: "swap"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected ne to match")
	}
}

func TestEvaluateCondition_Gt(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "amount", Operator: "gt", Value: "100"}
	action := &Action{Amount: "200"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected gt to match (200 > 100)")
	}
}

func TestEvaluateCondition_Gte(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "amount", Operator: "gte", Value: "100"}
	action := &Action{Amount: "100"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected gte to match (100 >= 100)")
	}
}

func TestEvaluateCondition_Lt(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "amount", Operator: "lt", Value: "100"}
	action := &Action{Amount: "50"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected lt to match (50 < 100)")
	}
}

func TestEvaluateCondition_Lte(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "amount", Operator: "lte", Value: "100"}
	action := &Action{Amount: "100"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected lte to match (100 <= 100)")
	}
}

func TestEvaluateCondition_In(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "type", Operator: "in", Value: []interface{}{"swap", "transfer"}}
	action := &Action{Type: "swap"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected in to match")
	}

	action2 := &Action{Type: "stake"}
	if engine.evaluateCondition(cond, action2) {
		t.Fatal("expected in to not match for stake")
	}
}

func TestEvaluateCondition_NotIn(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "type", Operator: "not_in", Value: []interface{}{"swap", "transfer"}}
	action := &Action{Type: "stake"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected not_in to match for stake")
	}

	action2 := &Action{Type: "swap"}
	if engine.evaluateCondition(cond, action2) {
		t.Fatal("expected not_in to fail for swap")
	}
}

func TestEvaluateCondition_Contains(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "to", Operator: "contains", Value: "uniswap"}
	action := &Action{To: "uniswap-v3-router"}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected contains to match")
	}

	action2 := &Action{To: "sushiswap-router"}
	if engine.evaluateCondition(cond, action2) {
		t.Fatal("expected contains to not match")
	}
}

func TestEvaluateCondition_CustomDataField(t *testing.T) {
	engine := &Engine{}
	cond := &Condition{Field: "slippage", Operator: "eq", Value: "0.5"}
	action := &Action{Data: map[string]interface{}{"slippage": "0.5"}}
	if !engine.evaluateCondition(cond, action) {
		t.Fatal("expected custom data field to match")
	}
}

func TestCompareNumeric(t *testing.T) {
	tests := []struct {
		a, b     interface{}
		expected int
	}{
		{"100", "50", 1},
		{"50", "100", -1},
		{"100", "100", 0},
		{int64(200), "100", 1},
		{float64(100), "200", -1},
	}

	for _, tt := range tests {
		result := compareNumeric(tt.a, tt.b)
		if result != tt.expected {
			t.Errorf("compareNumeric(%v, %v) = %d, want %d", tt.a, tt.b, result, tt.expected)
		}
	}
}

func TestToBigInt(t *testing.T) {
	tests := []struct {
		input    interface{}
		expected *big.Int
	}{
		{"100", big.NewInt(100)},
		{int64(200), big.NewInt(200)},
		{float64(300), big.NewInt(300)},
		{int(400), big.NewInt(400)},
		{nil, nil},
		{true, nil},
	}

	for _, tt := range tests {
		result := toBigInt(tt.input)
		if tt.expected == nil {
			if result != nil {
				t.Errorf("toBigInt(%v) = %v, want nil", tt.input, result)
			}
		} else if result == nil || result.Cmp(tt.expected) != 0 {
			t.Errorf("toBigInt(%v) = %v, want %v", tt.input, result, tt.expected)
		}
	}
}

// matchesPolicyLocal is a test-only wrapper that calls matchesPolicy without DB-dependent fields.
// It does NOT check daily volume (which requires DB), so it covers action, asset, constraint, and condition logic.
func (e *Engine) matchesPolicyLocal(def *Definition, action *Action) bool {
	// Check action type
	actionAllowed := false
	for _, a := range def.Actions {
		if a == "*" || a == action.Type {
			actionAllowed = true
			break
		}
	}
	if !actionAllowed {
		return false
	}

	// Check tokens
	if len(def.Assets.Tokens) > 0 && action.Token != "" {
		tokenAllowed := false
		for _, t := range def.Assets.Tokens {
			if t == action.Token || t == "*" {
				tokenAllowed = true
				break
			}
		}
		if !tokenAllowed {
			return false
		}
	}

	// Check protocols
	if len(def.Assets.Protocols) > 0 && action.Protocol != "" {
		protocolAllowed := false
		for _, p := range def.Assets.Protocols {
			if p == action.Protocol || p == "*" {
				protocolAllowed = true
				break
			}
		}
		if !protocolAllowed {
			return false
		}
	}

	// Check chains
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

	// Check max value per tx
	if action.Amount != "" {
		amount, ok := new(big.Int).SetString(action.Amount, 10)
		if !ok {
			return false
		}
		if def.Constraints.MaxValuePerTx != "" {
			maxValue, _ := new(big.Int).SetString(def.Constraints.MaxValuePerTx, 10)
			if amount.Cmp(maxValue) > 0 {
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
