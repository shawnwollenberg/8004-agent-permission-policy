---
name: guardrail-smart-accounts
description: Create, fund, and manage isolated ERC-4337 smart accounts for AI agents with enforced on-chain spending guardrails.
version: 1.0.3
metadata:
  openclaw:
    requires:
      env:
        - GUARDRAIL_CHAIN_ID
        - GUARDRAIL_RPC_URL
        - GUARDRAIL_SIGNING_MODE
    primaryEnv: GUARDRAIL_RPC_URL
    emoji: "\U0001F6E1"
    homepage: https://agentguardrail.xyz
---

# Guardrail Smart Accounts Skill

> Create, fund, and manage isolated ERC-4337 smart accounts for AI agents with enforced on-chain spending guardrails.

## Overview

The Guardrail Smart Accounts Skill enables agents and humans to create dedicated ERC-4337 smart accounts with built-in spending limits enforced on-chain. Every account is bound to a Guardrail policy at creation.

Guardrail never takes custody of funds — all enforcement occurs on-chain via deployed contracts.

This skill supports both:

- Programmatic agent execution
- Human-in-the-loop wallet workflows

It is designed as infrastructure: contract-level fees, policy-bound accounts, and non-custodial enforcement.

## Security & Credential Model (Required)

This skill performs on-chain operations that require:

- JSON-RPC access
- Transaction signing

**Private keys must never be provided in chat and must never be stored in unconstrained agent memory.**

The skill supports the following secure signing models:

### 1. External Signer (Recommended)

- The agent prepares a transaction.
- The runtime forwards it to a secure signer service (HSM, MPC, hosted signer).
- The signer enforces scope, rate limits, and allowlists.
- The agent never sees raw private keys.

### 2. Wallet Connector / User-Approved Signing

- Transactions are prepared by the agent.
- A user wallet (browser, hardware wallet) prompts for approval.
- Keys remain in the wallet.

### 3. Scoped Session Keys (Advanced)

- Session keys must be policy-restricted.
- Keys must have strict limits (value caps, allowlists).
- Keys must be short-lived and rotated frequently.
- Never expose a long-lived owner EOA private key.

### The Skill Must NOT

- Ask the user to paste private keys or seed phrases.
- Store private keys in memory, logs, or prompts.
- Access unrelated environment variables or local files.
- Request cloud credentials or system-level secrets.
- Persist secrets beyond runtime execution.

If secure signing is not configured, use this skill in **read-only mode** until proper signing is established.

## Required Runtime Configuration

These values must be provided via secure secret storage (not chat):

- `GUARDRAIL_CHAIN_ID` — Target chain identifier
- `GUARDRAIL_RPC_URL` — JSON-RPC endpoint for the target chain
- `GUARDRAIL_SIGNING_MODE` — one of: `external_signer`, `wallet_connector`, `session_key`

**Conditional configuration (signing-mode dependent):**

If the signing mode is set to `external_signer`, the runtime must also be configured with a signer endpoint URL and authentication token. These are provided by the external signer service and should be stored in the same secure secret storage as the required variables above.

If interacting with dashboard APIs (not required for direct contract usage), a dashboard API key may also be configured.

The runtime must validate the chain ID and reject unsupported networks by default.

## Core Capabilities

### 1. Create Smart Account

Deploy a new smart account via the Guardrail factory. The account is bound to a PermissionEnforcer and controlled by a signer (EOA or generated keypair).

- Deterministic deployment via CREATE2 (salt-based)
- Owner recorded on-chain
- One-time creation fee: $10 USD equivalent in ETH
- Policy-bound by default

**Factory Contract:** `AgentAccountFactory`
**Function:** `createAccount(address owner, bytes32 agentId, bytes32 salt) payable returns (address)`

```solidity
// Get required creation fee
uint256 fee = factory.getCreationFee();

// Deploy account (send fee as msg.value)
address account = factory.createAccount{value: fee}(ownerAddress, agentId, salt);
```

### 2. Fund Smart Account (Inbound Transfer)

Send ETH to the smart account address.

Inbound transfers are free.

```javascript
// NOTE: walletClient must be backed by a secure signer integration.
// Do NOT provide raw private keys to the agent.

await walletClient.sendTransaction({
  to: smartAccountAddress,
  value: parseEther("1.0"),
});
```

### 3. Withdraw from Smart Account (Outbound Transfer)

Execute a transfer from the smart account.

Outbound transfers are charged a 10 bps (0.10%) fee, capped at $100 USD equivalent per transaction.

**Function:** `execute(address target, uint256 value, bytes data)`

```javascript
const data = encodeFunctionData({
  abi: agentSmartAccountABI,
  functionName: "execute",
  args: [destinationAddress, parseEther("1.0"), "0x"],
});

await walletClient.sendTransaction({
  to: smartAccountAddress,
  data,
});
```

Fee enforcement occurs inside GuardrailFeeManager.

### 4. Read State (Safe / Read-Only)

These functions do not require signing.

```javascript
// Get account owner
const owner = await publicClient.readContract({
  address: smartAccountAddress,
  abi: agentSmartAccountABI,
  functionName: "owner",
});

// Get creation fee
const fee = await publicClient.readContract({
  address: factoryAddress,
  abi: agentAccountFactoryABI,
  functionName: "getCreationFee",
});

// Calculate transfer fee
const transferFee = await publicClient.readContract({
  address: feeManagerAddress,
  abi: guardrailFeeManagerABI,
  functionName: "calculateTransferFee",
  args: [parseEther("10.0")],
});
```

`publicClient` must be a read-only RPC client.

## Fee Structure

### Account Creation Fee

- **Amount:** $10 USD equivalent in ETH
- **When:** One-time, at smart account deployment
- **Enforced in:** AgentAccountFactory contract
- **Paid to:** Fee collector address via GuardrailFeeManager

### Transfer Fee (Outbound Only)

- **Rate:** 10 basis points (0.10%)
- **Cap:** $100 USD equivalent per transaction
- **When:** On every `execute()` or `executeBatch()` call with `value > 0`
- **Not charged on:**
  - Inbound deposits
  - Zero-value calls
  - ERC-20 transfers encoded in calldata

| Transfer Amount | Fee | Notes |
|----------------|-----|-------|
| $1,000 | $1 | |
| $10,000 | $10 | |
| $100,000 | $100 | Cap reached |
| $2,000,000 | $100 | Cap applies |

## Smart Contract Addresses

### Base Mainnet (Chain ID 8453)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0xc1fa477f991C74Cc665E605fC74f0e2B795b5104` |
| PolicyRegistry | `0x92cd41e6a4aA13072CeBCda8830d48f269F058c4` |
| PermissionEnforcer | `0xbF63Fa97cfBba99647B410f205730d63d831061c` |
| PriceOracle | `0xf3c8c6BDc54C60EDaE6AE84Ef05B123597C355B3` |
| GuardrailFeeManager | `0xD1B7Bd65F2aB60ff84CdDF48f306a599b01d293A` |
| AgentAccountFactory | `0xCE621A324A8cb40FD424EB0D41286A97f6a6c91C` |
| EntryPoint (v0.6) | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |

### Sepolia (Chain ID 11155111)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0xc1fa477f991C74Cc665E605fC74f0e2B795b5104` |
| PolicyRegistry | `0x92cd41e6a4aA13072CeBCda8830d48f269F058c4` |
| PermissionEnforcer | `0x94991827135fbd0E681B3db51699e4988a7752f1` |
| PriceOracle | `0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8` |
| GuardrailFeeManager | `0x0f77fdD1AFCe0597339dD340E738CE3dC9A5CC12` |
| AgentAccountFactory | `0xA831229B58C05d5bA9ac109f3B29e268A0e5F41E` |
| EntryPoint (v0.6) | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |

## Policy & Permission Management

Policies and permissions can be managed at:

**https://agentguardrail.xyz/**

The dashboard enables:

- Register agents and deploy smart accounts
- Create policies with spending limits, allowed tokens, protocols, and chains
- Grant and revoke permissions linking agents to policies
- Monitor audit logs and enforcement events

If using dashboard-generated signer keypairs or API keys:

- Store them in secure secret storage
- Never paste them into chat
- Prefer external signer or hardware-backed signing

## Autonomy & Safety Guidance

Because this skill can move funds on-chain:

1. Start on Sepolia testnet.
2. Fund accounts with small amounts initially.
3. Use strict Guardrail policies.
4. Enable autonomous execution only with secure signing configured.
5. Apply rate limits and allowlists at the signer layer.

## Design Principles

1. **Policy-Bound by Default** — Every account is bound to a Guardrail policy at creation.
2. **Agent and Human Neutral** — Authority derives from ownership and policy, not caller identity.
3. **Non-Custodial** — Guardrail never holds funds.
4. **Infrastructure First** — Fees are enforced at the contract layer. The API cannot bypass protocol economics.
5. **Least Privilege** — Signing must use scoped, secure integrations.
