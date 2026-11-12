import postgres from "postgres";

let schemaReady: Promise<void> | null = null;

export function openPayStore() {
  // Match MOCHI's Supabase Postgres connection convention. Keep the older
  // project-specific names as fallbacks for existing local/deployment setups.
  const connectionString = process.env.DATABASE_URL || process.env.ZOLIUS_DATABASE_URL || process.env.WAITLIST_DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  const ssl = process.env.PGSSLMODE?.toLowerCase() === "disable" ? false : "require";
  return postgres(connectionString, { max: 1, connect_timeout: 5, idle_timeout: 5, prepare: false, ssl });
}

export function ensurePaySchema(sql: ReturnType<typeof postgres>): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS zolius_pay_handles (
          handle TEXT PRIMARY KEY,
          owner_address TEXT NOT NULL UNIQUE,
          vault_public_key TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS zolius_pay_invoices (
          id UUID PRIMARY KEY,
          handle TEXT NOT NULL REFERENCES zolius_pay_handles(handle),
          envelope JSONB NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          consumed_at TIMESTAMPTZ
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS zolius_agent_waitlist (
          id BIGSERIAL PRIMARY KEY,
          contact TEXT NOT NULL UNIQUE,
          interest TEXT NOT NULL CHECK (interest IN ('building','use')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })().catch((error: unknown) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}
