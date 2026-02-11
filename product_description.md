# Product Description

## _Agent Permission & Policy SaaS (ERC-8004 Native)_

### One-line description

A **permission, policy, and audit layer for AI agents** that lets users safely authorize what agents can do on-chain—clearly, revocably, and programmatically.

> _AWS IAM + CloudTrail for autonomous crypto agents._

---

## What you are actually building (concretely)

### Core components

### **1. Policy Engine**

The heart of the product.

- Define **who** (agent)
    
- Can do **what** (actions)
    
- On **which assets**
    
- Under **what constraints**
    
- For **how long**
    

**Examples**

- “Agent A can trade ETH/USDC up to $5k/day”
    
- “Agent B can rebalance LP positions weekly”
    
- “Agent C can read balances but never write”
    

Policies compile into **ERC-8004 permissions**.

---

### **2. ERC-8004 Authorization Issuer**

- Mints / registers ERC-8004 permission objects
    
- Links permissions to:
    
    - wallet
        
    - agent
        
    - policy
        
- Handles:
    
    - expiry
        
    - revocation
        
    - rotation
        

This is where standards compliance becomes your moat.

---

### **3. Enforcement & Validation Layer**

Two tiers based on wallet type:

**a) Advisory (EOA Wallet)**

- Agent frameworks call your API to:

    - validate intent

    - simulate constraints

    - log decisions

- Monitoring + alerts only — cannot prevent on-chain execution

- This is the entry point; most agents start here


**b) Enforced (ERC-4337 Smart Account)**

- Agent operates through an ERC-4337 smart account (`AgentSmartAccount`)

- `validateUserOp` calls `PermissionEnforcer` before every transaction

- Violating transactions **revert before execution** — guaranteed enforcement

- Off-chain validation still runs (needed for dashboards, simulation, pre-flight checks)

- Upgrade from advisory to enforced is one-way (cannot downgrade)


This lets you win **before full on-chain enforcement is common** with advisory mode, then upsell to guaranteed enforcement via smart accounts.

---

### **4. Audit & Activity Log**

- Immutable policy history
    
- Agent execution trails
    
- Revocation events
    
- Violations / near-violations
    

This quietly sets you up for **compliance + observability later**.

---

### **5. Dashboard & API**

- Human UI: define + revoke permissions
    
- Machine API: validate permissions in real-time
    
- Webhooks: notify on violations or expiry
    

---

## Tech stack (solo-builder realistic)

- **Backend:** Go (obviously)
    
- **DB:** Postgres (policies, logs)
    
- **Chain:** Start with EVM only
    
- **Auth:** Wallet + API keys
    
- **Contracts:** ERC-8004 reference implementation + ERC-4337 smart accounts

- **Infra:** Railway (backend) + Vercel (frontend) early → EKS later

- **SDK:** JS + Python (agents live there)