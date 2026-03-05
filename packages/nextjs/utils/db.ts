import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    sql = postgres(connectionString, { ssl: "require" });
  }
  return sql;
}

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const db = getDb();
  await db`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      nonce INTEGER NOT NULL,
      to_address TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '0',
      data TEXT NOT NULL DEFAULT '0x',
      description TEXT NOT NULL,
      signatures JSONB NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  initialized = true;
}
