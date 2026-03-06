import { NextResponse } from "next/server";

const SKILL_MD = `# clawd-multisig SKILL.md

## What This Is
A 2/3 multisig wallet on Base mainnet. Offchain signature gathering — no gas to sign, only to execute. Three signers, 2 required.

## Signers
- AI Agent (ClawdGut): \`0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E\`
- Hot wallet (Austin / atg.eth): \`0x34aA3F359A9D614239015126635CE7732c18fDF3\`
- Cold wallet: \`0x90eF2A9211A3E7CE788561E5af54C76B0Fa3aEd0\`

## Contract
- Address: \`0x17CbCc995593D443c6014562075BD3ecA24d31e0\`
- Chain: Base mainnet (chainId: 8453)
- RPC: \`https://base-mainnet.g.alchemy.com/v2/8GVG8WjDs-sGFRr6Rm839\`

## Key Insight: Signature Ordering
Signatures MUST be submitted in ascending signer address order. The contract uses \`recovered > duplicateGuard\` to dedup in O(n). Sort by recovered address before calling executeTransaction.

## How to Propose a Transaction (as AI Agent)

1. Get current nonce:
   \`cast call <CONTRACT> "nonce()" --rpc-url https://base-mainnet.g.alchemy.com/v2/8GVG8WjDs-sGFRr6Rm839\`

2. Compute tx hash via API:
   \`GET /api/transactions/hash?nonce=<n>&to=<addr>&value=<wei>&data=<hex>\`

3. Sign the hash (EIP-191 personal_sign) with AI agent key:
   \`cast wallet sign --private-key <key> <hash>\`

4. Submit proposal:
   \`\`\`
   POST /api/transactions
   {
     "nonce": <n>,
     "to": "<address>",
     "value": "<wei as string>",
     "data": "0x",
     "description": "<plain english — what this tx does and why>",
     "signer": "0x09defC9E6ffc5e41F42e0D50512EEf9354523E0E",
     "sig": "<0x signature>"
   }
   \`\`\`

5. Return the URL to Austin: \`<APP_URL>/transactions\`

## Check Pending Transactions
\`GET /api/transactions\`

## Add a Signature
\`POST /api/transactions/:id/sign\`
\`{ "signer": "<addr>", "sig": "<0x sig>" }\`

## Execute a Transaction
When signatures.length >= 2:
1. Sort signatures by recovered signer address ASCENDING
2. Call executeTransaction onchain from any owner address:
   \`cast send <CONTRACT> "executeTransaction(address,uint256,bytes,bytes[])" <to> <value> <data> [<sig1>,<sig2>] --private-key <key> --rpc-url <rpc>\`
   Or use the Execute button on /transactions

## Contract ABI (key functions)
\`\`\`json
[
  {"name":"nonce","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"name":"signaturesRequired","type":"function","stateMutability":"view","inputs":[],"outputs":[{"type":"uint256"}]},
  {"name":"isOwner","type":"function","stateMutability":"view","inputs":[{"name":"","type":"address"}],"outputs":[{"type":"bool"}]},
  {"name":"getTransactionHash","type":"function","stateMutability":"view","inputs":[{"name":"_nonce","type":"uint256"},{"name":"to","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"}],"outputs":[{"type":"bytes32"}]},
  {"name":"executeTransaction","type":"function","stateMutability":"nonpayable","inputs":[{"name":"to","type":"address"},{"name":"value","type":"uint256"},{"name":"data","type":"bytes"},{"name":"signatures","type":"bytes[]"}],"outputs":[{"type":"bytes"}]}
]
\`\`\`

## API Reference
- \`GET  /api/transactions\` — list pending
- \`POST /api/transactions\` — propose new tx (with first sig)
- \`POST /api/transactions/:id/sign\` — add signature
- \`DELETE /api/transactions/:id\` — mark executed
- \`GET  /api/transactions/hash?nonce=&to=&value=&data=\` — compute tx hash

## Security Rules
- NEVER commit private keys
- ALWAYS verify description matches actual calldata before signing
- Signatures must be sorted by address ascending before execute
- The AI agent can execute txs when it has Base ETH for gas
`;

export async function GET() {
  return new NextResponse(SKILL_MD, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
