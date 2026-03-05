# clawd-multisig — Plan

## Overview
AI-agent-powered 2/3 multisig wallet on Base mainnet. Built with Scaffold-ETH 2 + Foundry.

The core idea: Austin (hot wallet), ClawdGut AI agent, and a cold wallet recovery key. 2-of-3 required. 
Austin talks to the AI, AI queues a transaction, sends Austin a link, Austin signs with hot wallet, AI executes.

## Signers
| Role | Address |
|------|---------|
| AI Agent (ClawdGut) | 0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E |
| Hot wallet (atg.eth) | 0x34aA3F359A9D614239015126635CE7732c18fDF3 |
| Cold wallet (recovery) | 0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0 |

## Architecture
- **Contract**: Minimal Solidity multisig on Base. Offchain signing, onchain execution.
- **TX Pool**: Neon Postgres via Vercel (DATABASE_URL). No onchain proposals — cheap and simple.
- **Frontend**: SE2 Next.js app. Three pages: home, transactions, create.
- **SKILL.md**: Hosted at /skill.md — teaches AI agents how to use the multisig.

## The Duplicate-Guard Trick
```solidity
address duplicateGuard;
for (uint i = 0; i < signatures.length; i++) {
    address recovered = recover(_hash, signatures[i]);
    require(recovered > duplicateGuard, "duplicate or unordered signatures");
    duplicateGuard = recovered;
    if (isOwner[recovered]) validSignatures++;
}
```
Signatures submitted in ascending address order. Single comparison per iteration. O(n), zero extra storage. No mappings, no nested loops. Elegant.

## Backend Schema
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  nonce INTEGER NOT NULL,
  to_address TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '0',
  data TEXT NOT NULL DEFAULT '0x',
  description TEXT NOT NULL,
  signatures JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Routes
- `/` — Home: contract info, signers, balance
- `/transactions` — Pending tx pool: sign + execute
- `/create` — Propose new transaction
- `/skill.md` — AI agent skill file

## Env Vars (set in Vercel)
- `DATABASE_URL` — Neon Postgres connection string
- `NEXT_PUBLIC_ALCHEMY_API_KEY` — `8GVG8WjDs-sGFRr6Rm839`

## Deploy Steps
1. `cd packages/foundry && forge script script/DeployMetaMultiSigWallet.s.sol --rpc-url base --broadcast --verify`
2. Update CONTRACT_ADDRESS in `/api/transactions/hash` route
3. Update SKILL.md with deployed address
4. `yarn vercel --prod`

## v2 Roadmap
- Factory + proxy pattern (EIP-1167 minimal proxy)
- Deploy to mainnet, Base, Arbitrum at same address using CREATE2
- Anyone can deploy their own instance at the factory URL
- clawd-transaction-vision integration for auto-generating plain english descriptions
