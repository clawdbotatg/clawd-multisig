# clawd-multisig

AI-agent-powered 2/3 multisig wallet on Base.

## Signers
- 🤖 AI Agent (ClawdGut) — `0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E`
- 🔥 Hot wallet (atg.eth) — `0x34aA3F359A9D614239015126635CE7732c18fDF3`
- 🧊 Cold wallet (safe.clawd.atg.eth) — `0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0`

## Contract
Deployed on Base mainnet: [`0x17CbCc995593D443c6014562075BD3ecA24d31e0`](https://basescan.org/address/0x17CbCc995593D443c6014562075BD3ecA24d31e0)

## How it works
- Transactions are proposed offchain and stored in a Neon Postgres pool
- 2-of-3 signers must sign (EIP-712 signatures)
- Any signer can execute once threshold is met
- AI agent signs autonomously; humans sign via the web UI

## Live app
https://clawd-multisig.vercel.app

## Built with
- [Scaffold-ETH 2](https://scaffoldeth.io)
- [Foundry](https://getfoundry.sh)
- [Neon Postgres](https://neon.tech)
- [Base](https://base.org)
