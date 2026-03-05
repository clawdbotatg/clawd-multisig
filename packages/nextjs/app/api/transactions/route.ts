import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getDb } from "~~/utils/db";

// GET /api/transactions — list pending transactions
export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const transactions = await db`
      SELECT * FROM transactions
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ transactions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/transactions — create a new transaction with first signature
export async function POST(request: NextRequest) {
  try {
    await ensureSchema();
    const db = getDb();
    const body = await request.json();
    const { nonce, to, value, data, description, signer, sig } = body;

    if (!to || !description || !signer || !sig) {
      return NextResponse.json({ error: "Missing required fields: to, description, signer, sig" }, { status: 400 });
    }

    const signatures = JSON.stringify([{ signer, sig }]);

    const result = await db`
      INSERT INTO transactions (nonce, to_address, value, data, description, signatures)
      VALUES (${nonce ?? 0}, ${to}, ${value ?? "0"}, ${data ?? "0x"}, ${description}, ${signatures})
      RETURNING *
    `;

    return NextResponse.json({ transaction: result[0] }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
