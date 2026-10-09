import type { Metadata } from "next";
import { AddQuestion } from "./add-question";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Add question · Murali Sir" };

export default async function AddPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("topics").select("name").order("name");
  return <AddQuestion allTopics={(data ?? []).map((t) => t.name)} />;
}
