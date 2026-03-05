import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getDb } from "~~/utils/db";

// POST /api/transactions/[id]/sign — add a signature to a transaction
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await params;
    const body = await request.json();
    const { signer, sig } = body;

    if (!signer || !sig) {
      return NextResponse.json({ error: "Missing required fields: signer, sig" }, { status: 400 });
    }

    // Get current transaction
    const txs = await db`SELECT * FROM transactions WHERE id = ${id} AND status = 'pending'`;
    if (txs.length === 0) {
      return NextResponse.json({ error: "Transaction not found or already executed" }, { status: 404 });
    }

    const tx = txs[0];
    const signatures = tx.signatures as { signer: string; sig: string }[];

    // Check for duplicate signer
    const alreadySigned = signatures.some((s: { signer: string }) => s.signer.toLowerCase() === signer.toLowerCase());
    if (alreadySigned) {
      return NextResponse.json({ error: "This address has already signed" }, { status: 400 });
    }

    // Append new signature
    const updatedSignatures = [...signatures, { signer, sig }];

    await db`
      UPDATE transactions
      SET signatures = ${JSON.stringify(updatedSignatures)}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true, signatures: updatedSignatures });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
