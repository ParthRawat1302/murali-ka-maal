import type { ReactNode } from "react";
import { AppProvider } from "@/components/app-context";
import { Header } from "@/components/header";
import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const supabase = await supabaseServer();
  const { data: people } = await supabase.from("profiles").select("id, display_name");

  return (
    <AppProvider profile={profile} people={people ?? []}>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:py-6">{children}</main>
    </AppProvider>
  );
}
