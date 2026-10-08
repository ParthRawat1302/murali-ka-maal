import { config } from "dotenv";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

config({ path: ".env.local", quiet: true });

export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env.local`);
  return v;
}

export function adminClient() {
  return createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function pgClient() {
  const ref = need("SUPABASE_PROJECT_REF");
  const client = new Client({
    host: need("SUPABASE_DB_HOST"),
    port: 5432,
    user: `postgres.${ref}`,
    password: need("SUPABASE_DB_PASSWORD"),
    database: "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}

// Must match src/lib/auth.ts
export function userEmail(username: string) {
  return `${username}@algoweb.local`;
}
export function userPassword(username: string) {
  return createHmac("sha256", need("AUTH_PEPPER")).update(username).digest("base64url");
}
