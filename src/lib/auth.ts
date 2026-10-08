import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "./supabase/server";
import type { Profile } from "./types";

/** Name of the last person who signed in on this browser (login form default). */
export const LAST_NAME_COOKIE = "last_name";

// Must match scripts/seed-users.ts and scripts/lib/env.ts
export function usernameFromName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");
}
export function userEmail(username: string) {
  return `${username}@algoweb.local`;
}
export function userPassword(username: string) {
  return createHmac("sha256", process.env.AUTH_PEPPER!).update(username).digest("base64url");
}

export function passcodeMatches(given: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(process.env.CLASS_PASSCODE ?? "");
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

/** The signed-in member's profile, or a redirect to /login. */
export const requireProfile = cache(async (): Promise<Profile> => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_admin")
    .eq("id", uid)
    .maybeSingle();
  if (!data) redirect("/login?error=noprofile");
  return data as Profile;
});
