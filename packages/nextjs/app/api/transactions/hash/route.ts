import { NextRequest, NextResponse } from "next/server";
import { encodePacked, keccak256 } from "viem";

const CONTRACT_ADDRESS = "0x17CbCc995593D443c6014562075BD3ecA24d31e0" as `0x${string}`;
const CHAIN_ID = 8453n;

// GET /api/transactions/hash — compute the transaction hash matching the contract's getTransactionHash
// Returns the raw hash (no EIP-191 prefix). The wallet's personal_sign will add the
// "\x19Ethereum Signed Message:\n32" prefix, which matches the contract's toEthSignedMessageHash().
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nonce = searchParams.get("nonce");
    const to = searchParams.get("to");
    const value = searchParams.get("value");
    const data = searchParams.get("data");

    if (!nonce || !to) {
      return NextResponse.json({ error: "Missing required params: nonce, to" }, { status: 400 });
    }

    // Match contract: keccak256(abi.encodePacked(address(this), chainId, _nonce, to, value, data))
    const rawHash = keccak256(
      encodePacked(
        ["address", "uint256", "uint256", "address", "uint256", "bytes"],
        [
          CONTRACT_ADDRESS,
          CHAIN_ID,
          BigInt(nonce),
          to as `0x${string}`,
          BigInt(value || "0"),
          (data || "0x") as `0x${string}`,
        ],
      ),
    );

    return NextResponse.json({ hash: rawHash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
