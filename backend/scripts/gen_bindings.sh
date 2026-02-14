#!/usr/bin/env bash
# gen_bindings.sh — Generate Go bindings from Foundry ABI output
# Requires: abigen (from go-ethereum tools), jq
#
# Install abigen:
#   go install github.com/ethereum/go-ethereum/cmd/abigen@v1.14.8
#
# Usage:
#   cd backend && bash scripts/gen_bindings.sh

set -euo pipefail

CONTRACTS_DIR="../contracts/out"
OUTPUT_DIR="internal/blockchain/bindings"

mkdir -p "$OUTPUT_DIR"

contracts=(
  "IdentityRegistry:IdentityRegistry.sol/IdentityRegistry.json:identityregistry"
  "PolicyRegistry:PolicyRegistry.sol/PolicyRegistry.json:policyregistry"
  "PermissionEnforcer:PermissionEnforcer.sol/PermissionEnforcer.json:permissionenforcer"
  "PriceOracle:PriceOracle.sol/PriceOracle.json:priceoracle"
  "AgentAccountFactory:AgentAccountFactory.sol/AgentAccountFactory.json:agentaccountfactory"
)

for entry in "${contracts[@]}"; do
  IFS=: read -r name path pkg <<< "$entry"
  abi_file="$CONTRACTS_DIR/$path"

  if [ ! -f "$abi_file" ]; then
    echo "SKIP: $abi_file not found"
    continue
  fi

  echo "Generating $name -> $OUTPUT_DIR/$pkg.go"

  # Extract ABI from Forge JSON artifact
  jq -r '.abi' "$abi_file" > "/tmp/${name}_abi.json"

  abigen \
    --abi "/tmp/${name}_abi.json" \
    --pkg bindings \
    --type "$name" \
    --out "$OUTPUT_DIR/$pkg.go"

  rm "/tmp/${name}_abi.json"
done

echo "Done. Generated bindings in $OUTPUT_DIR/"
