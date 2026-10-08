"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LAST_NAME_COOKIE, passcodeMatches, userEmail, usernameFromName, userPassword } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const name = String(form.get("name") ?? "");
  const passcode = String(form.get("passcode") ?? "");
  const username = usernameFromName(name);

  if (!username || !passcode) return { error: "Enter your name and password." };
  // Same message for both cases so names can't be probed.
  const denied = { error: "That name and password don't match." };
  if (!passcodeMatches(passcode)) return denied;

  const { data: profile } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return denied;

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: userEmail(username),
    password: userPassword(username),
  });
  if (error) return { error: "Sign-in failed. Ask the admin to re-run the user seed." };

  // Remember who signed in on this browser so the login form is pre-filled next time.
  (await cookies()).set(LAST_NAME_COOKIE, name.trim(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 400 * 24 * 60 * 60,
  });
  redirect("/");
}

export async function logout(sessionId?: string) {
  const supabase = await supabaseServer();
  if (sessionId) {
    await supabase.from("app_sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionId);
  }
  await supabase.auth.signOut();
  redirect("/login");
}
