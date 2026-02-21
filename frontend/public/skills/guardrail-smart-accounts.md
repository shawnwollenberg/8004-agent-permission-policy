# Guardrail Smart Accounts Skill

> Create, fund, and manage isolated smart accounts for AI agents with enforced spending guardrails.

## Overview

The Guardrail Smart Accounts Skill enables agents and humans to create dedicated ERC-4337 smart accounts with built-in spending limits enforced on-chain. Every account is bound to a Guardrail policy at creation. Guardrail never takes custody of funds — all enforcement is on-chain.

## Core Capabilities

### 1. Create Smart Account

Deploy a new smart account via the Guardrail factory. The account is bound to a PermissionEnforcer and controlled by a signer (EOA or generated keypair).

- Deterministic deployment via CREATE2 (salt-based)
- Owner recorded on-chain
- One-time creation fee: $10 USD equivalent in ETH

**Factory Contract:** `AgentAccountFactory`
**Function:** `createAccount(address owner, bytes32 agentId, bytes32 salt) payable returns (address)`

```solidity
// Get required creation fee
uint256 fee = factory.getCreationFee();

// Deploy account (send fee as msg.value)
address account = factory.createAccount{value: fee}(ownerAddress, agentId, salt);
```

### 2. Fund Smart Account (Inbound Transfer)

Send ETH to the smart account address. Inbound transfers are free — no fees charged.

```javascript
// Simple ETH transfer to the smart account
await walletClient.sendTransaction({
  to: smartAccountAddress,
  value: parseEther("1.0"),
});
```

### 3. Withdraw from Smart Account (Outbound Transfer)

Execute a transfer from the smart account. Outbound transfers with ETH value are charged a 10 bps (0.10%) fee, capped at $100 USD equivalent per transaction.

**Function:** `execute(address target, uint256 value, bytes data)`

```javascript
// Call execute() to send ETH from the smart account
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

### 4. Read State

Query smart account state and fee information.

```javascript
// Get account owner
const owner = await publicClient.readContract({
  address: smartAccountAddress,
  abi: agentSmartAccountABI,
  functionName: "owner",
});

// Get creation fee in wei
const fee = await publicClient.readContract({
  address: factoryAddress,
  abi: agentAccountFactoryABI,
  functionName: "getCreationFee",
});

// Calculate transfer fee for a given value
const transferFee = await publicClient.readContract({
  address: feeManagerAddress,
  abi: guardrailFeeManagerABI,
  functionName: "calculateTransferFee",
  args: [parseEther("10.0")],
});
```

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
- **Not charged on:** Inbound deposits, zero-value calls (ERC-20 via calldata)

| Transfer Amount | Fee | Notes |
|----------------|-----|-------|
| $1,000 | $1 | |
| $10,000 | $10 | |
| $100,000 | $100 | Cap reached |
| $2,000,000 | $100 | Cap applies |

## Smart Contract Addresses (Sepolia)

| Contract | Address |
|----------|---------|
| IdentityRegistry | `0xc1fa477f991C74Cc665E605fC74f0e2B795b5104` |
| PolicyRegistry | `0x92cd41e6a4aA13072CeBCda8830d48f269F058c4` |
| PriceOracle | `0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8` |
| EntryPoint (v0.6) | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |
| Chain ID | `11155111` |

> Note: PermissionEnforcer, GuardrailFeeManager, and AgentAccountFactory addresses are updated with each deployment. Check the docs page or llms.txt for current addresses.

## Key Function Signatures

### AgentAccountFactory
```
createAccount(address owner, bytes32 agentId, bytes32 salt) payable returns (address)
getAddress(address owner, bytes32 agentId, bytes32 salt) view returns (address)
getCreationFee() view returns (uint256)
```

### AgentSmartAccount
```
execute(address target, uint256 value, bytes data)
executeBatch(address[] targets, uint256[] values, bytes[] datas)
owner() view returns (address)
agentId() view returns (bytes32)
entryPoint() view returns (address)
```

### GuardrailFeeManager
```
getCreationFeeWei() view returns (uint256)
calculateTransferFee(uint256 value) view returns (uint256)
feeCollector() view returns (address)
creationFeeUsd() view returns (uint256)
transferFeeBps() view returns (uint256)
transferFeeCapUsd() view returns (uint256)
```

## Design Principles

1. **Policy-Bound by Default** — Every account is bound to a Guardrail policy at creation. No naked smart accounts.
2. **Agent and Human Neutral** — Anyone can call the skill. Ownership and policy determine authority, not caller identity.
3. **Non-Custodial** — Guardrail never takes custody of funds. All enforcement is on-chain.
4. **Infrastructure First** — Fees are contract-level. The API cannot bypass protocol economics. Works whether called via skill, API, or UI.
