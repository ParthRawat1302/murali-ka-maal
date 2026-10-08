import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LAST_NAME_COOKIE } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Murali ka maal" };

export default async function LoginPage() {
  const lastName = (await cookies()).get(LAST_NAME_COOKIE)?.value ?? "";
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-16">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-accent-fg">
            {"{ }"}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Murali ka maal</h1>
          <p className="mt-1 text-sm text-muted">Class DSA practice tracker</p>
        </div>
        <Suspense>
          <LoginForm defaultName={lastName} />
        </Suspense>
      </div>
    </main>
  );
}
