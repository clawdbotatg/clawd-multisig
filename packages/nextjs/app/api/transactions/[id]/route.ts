import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getDb } from "~~/utils/db";

// DELETE /api/transactions/[id] — mark transaction as executed
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureSchema();
    const db = getDb();
    const { id } = await params;

    await db`
      UPDATE transactions
      SET status = 'executed'
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
