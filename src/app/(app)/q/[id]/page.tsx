import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionView } from "./question-view";
import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { Intent, Note, Question } from "@/lib/types";

export async function generateMetadata(props: PageProps<"/q/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("questions").select("title").eq("id", id).maybeSingle();
  return { title: data ? `${data.title} · Murali Sir` : "Murali Sir" };
}

export default async function QuestionPage(props: PageProps<"/q/[id]">) {
  const { id } = await props.params;
  const { tab } = await props.searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const profile = await requireProfile();
  const supabase = await supabaseServer();
  const [question, qtopics, notes, progress, topics, intents] = await Promise.all([
    supabase.from("questions").select("*").eq("id", id).maybeSingle(),
    supabase.from("question_topics").select("topics(name)").eq("question_id", id),
    supabase.from("notes").select("*").eq("question_id", id).order("created_at"),
    supabase.from("progress").select("solved").eq("question_id", id).eq("user_id", profile.id).maybeSingle(),
    supabase.from("topics").select("name").order("name"),
    supabase
      .from("question_intents")
      .select("source_type, source_label, source_date, topics(name)")
      .eq("question_id", id)
      .order("source_date"),
  ]);
  if (!question.data) notFound();

  const topicNames = ((qtopics.data ?? []) as unknown as { topics: { name: string } | null }[])
    .map((r) => r.topics?.name)
    .filter(Boolean) as string[];

  return (
    <QuestionView
      key={id}
      initialQuestion={question.data as Question}
      initialTopics={topicNames.sort()}
      initialNotes={(notes.data ?? []) as Note[]}
      initialSolved={!!progress.data?.solved}
      intents={((intents.data ?? []) as unknown as (Omit<Intent, "topic"> & { topics: { name: string } })[]).map(
        ({ topics: t, ...i }) => ({ ...i, topic: t.name }),
      )}
      allTopics={(topics.data ?? []).map((t) => t.name)}
      initialTab={tab === "notes" ? "notes" : tab === "history" ? "history" : "statement"}
    />
  );
}
