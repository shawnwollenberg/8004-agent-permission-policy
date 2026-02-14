Contracts deployed and verified on Sepolia!

  Deployed Contract Addresses:
  ┌─────────────────────────────┬────────────────────────────────────────────┬─────────────────────┐
  │          Contract           │                  Address                   │       Status        │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ IdentityRegistry            │ 0xc1fa477f991C74Cc665E605fC74f0e2B795b5104 │ Unchanged           │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ PolicyRegistry              │ 0x92cd41e6a4aA13072CeBCda8830d48f269F058c4 │ Unchanged           │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ PermissionEnforcer (v3)     │ 0xBe1cd378Ec32Feb71851B2EFbb0D9c6635cc22DF │ Deployed + Verified │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ PriceOracle (NEW)           │ 0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8 │ Deployed + Verified │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ AgentAccountFactory (v3)    │ 0xA6F9dA39086CD7142c1494B062D70c8fB7e3896f │ Deployed + Verified │
  └─────────────────────────────┴────────────────────────────────────────────┴─────────────────────┘

  View on Etherscan:
  - https://sepolia.etherscan.io/address/0xc1fa477f991c74cc665e605fc74f0e2b795b5104
  - https://sepolia.etherscan.io/address/0x92cd41e6a4aa13072cebcda8830d48f269f058c4
  - https://sepolia.etherscan.io/address/0xbe1cd378ec32feb71851b2efbb0d9c6635cc22df
  - https://sepolia.etherscan.io/address/0x052cdddba3c55a63f5e48f9e5bc6b70604db93b8
  - https://sepolia.etherscan.io/address/0xa6f9da39086cd7142c1494b062d70c8fb7e3896f

  EntryPoint v0.6 (canonical): 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789

  Chainlink Price Feeds (Sepolia):
  - ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306
  - USDC/USD: 0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E
  - LINK/USD: 0xc59E3633BAAC79493d908e63626716e204A45EdF

  PriceOracle wired to PermissionEnforcer via setPriceOracle().
  Token feeds configured: USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238), LINK (0x779877A7B0D9E8603169DdbD7836e478b4624789).

  Previous Deployments:
  ┌─────────────────────────────┬────────────────────────────────────────────┬─────────────────────┐
  │          Contract           │                  Address                   │       Status        │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ PermissionEnforcer (v2)     │ 0xf3c8c6BDc54C60EDaE6AE84Ef05B123597C355B3 │ Superseded          │
  ├─────────────────────────────┼────────────────────────────────────────────┼─────────────────────┤
  │ AgentAccountFactory (v2)    │ 0x28bd44158F7A824eB20330D761035cCb7D1D2AD5 │ Superseded          │
  └─────────────────────────────┴────────────────────────────────────────────┴─────────────────────┘

  Railway Environment Variables to Update:
  - PERMISSION_ENFORCER_ADDRESS=0xBe1cd378Ec32Feb71851B2EFbb0D9c6635cc22DF
  - PRICE_ORACLE_ADDRESS=0x052cDddba3C55A63F5e48F9e5bC6b70604Db93b8
  - SMART_ACCOUNT_FACTORY_ADDRESS=0xA6F9dA39086CD7142c1494B062D70c8fB7e3896f
