import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/dashboard";
import { requireProfile } from "@/lib/auth";
import { daysAgoISO } from "@/lib/dates";
import { supabaseServer } from "@/lib/supabase/server";
import type { QuestionListItem } from "@/lib/types";

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await supabaseServer();
  const yearAgo = daysAgoISO(370);

  const [questions, progress, activity, topics] = await Promise.all([
    supabase.from("question_list").select("*").order("source_date", { ascending: false }),
    supabase.from("progress").select("question_id").eq("user_id", profile.id).eq("solved", true),
    supabase.from("activity_days").select("day, solves, edits").eq("user_id", profile.id).gte("day", yearAgo),
    supabase.from("topics").select("name").order("name"),
  ]);

  return (
    <Suspense>
      <Dashboard
        questions={(questions.data ?? []) as QuestionListItem[]}
        solvedIds={(progress.data ?? []).map((p) => p.question_id)}
        activity={activity.data ?? []}
        topics={(topics.data ?? []).map((t) => t.name)}
      />
    </Suspense>
  );
}
