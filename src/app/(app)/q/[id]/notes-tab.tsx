"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { JSONContent } from "@tiptap/react";
import { Globe, Lock, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { DocEditor } from "@/components/editor/doc-editor";
import { supabaseBrowser } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/dates";
import type { Note, Visibility } from "@/lib/types";

/** A note plus the server version its editor content was last loaded from. */
export type NoteState = Note & { docVersion: string };

export function NotesTab({
  questionId,
  notes,
  setNotes,
}: {
  questionId: string;
  notes: NoteState[];
  setNotes: Dispatch<SetStateAction<NoteState[]>>;
}) {
  const { profile } = useApp();
  const [creating, setCreating] = useState<Visibility | null>(null);

  async function create(visibility: Visibility) {
    setCreating(visibility);
    const { data, error } = await supabaseBrowser()
      .from("notes")
      .insert({
        question_id: questionId,
        visibility,
        title: visibility === "private" ? "My private note" : "Trick / approach",
      })
      .select("*")
      .single();
    setCreating(null);
    if (error) return alert(error.message);
    setNotes((list) =>
      list.some((n) => n.id === data.id) ? list : [...list, { ...(data as Note), docVersion: data.updated_at }],
    );
  }

  const publicNotes = notes.filter((n) => n.visibility === "public");
  const privateNotes = notes.filter((n) => n.visibility === "private" && n.owner_id === profile.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={() => create("public")} disabled={!!creating}>
          <Plus size={16} /> <Globe size={14} /> Public note
        </button>
        <button className="btn" onClick={() => create("private")} disabled={!!creating}>
          <Plus size={16} /> <Lock size={14} /> Private note
        </button>
        <span className="text-xs text-muted">
          Public notes show your name and everyone can see and edit them (only you can delete them). Private notes
          are only visible to you.
        </span>
      </div>

      {notes.length === 0 && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-sm text-muted">
          <NotebookPen size={28} />
          No notes yet. Add the teacher&apos;s solution, your approach, or photos of the board.
        </div>
      )}

      {[...publicNotes, ...privateNotes].map((n) => (
        <NoteCard key={n.id} note={n} setNotes={setNotes} />
      ))}
    </div>
  );
}

function NoteCard({ note, setNotes }: { note: NoteState; setNotes: Dispatch<SetStateAction<NoteState[]>> }) {
  const { profile, people } = useApp();
  const [title, setTitle] = useState(note.title);
  const [prevTitle, setPrevTitle] = useState(note.title);
  const isOwner = note.owner_id === profile.id;
  const canEdit = note.visibility === "public" || isOwner;

  // Pick up title changes from others.
  if (note.title !== prevTitle) {
    setPrevTitle(note.title);
    setTitle(note.title);
  }

  const patch = (p: Partial<NoteState>) =>
    setNotes((list) => list.map((n) => (n.id === note.id ? { ...n, ...p } : n)));

  async function saveContent(doc: JSONContent | null) {
    const { data, error } = await supabaseBrowser()
      .from("notes")
      .update({ content: doc })
      .eq("id", note.id)
      .select("updated_at")
      .single();
    if (error) throw error;
    patch({ content: doc, updated_at: data.updated_at, updated_by: profile.id });
    return data.updated_at as string;
  }

  async function saveTitle() {
    const t = title.trim() || "Untitled note";
    if (t === note.title) return setTitle(t);
    const { error } = await supabaseBrowser().from("notes").update({ title: t }).eq("id", note.id);
    if (error) return alert(error.message);
    setPrevTitle(t);
    setTitle(t);
    patch({ title: t });
  }

  async function toggleVisibility() {
    const next: Visibility = note.visibility === "public" ? "private" : "public";
    const msg =
      next === "public"
        ? "Make this note public? Everyone will be able to see and edit it."
        : "Make this note private? Others will no longer see it.";
    if (!confirm(msg)) return;
    const { error } = await supabaseBrowser().from("notes").update({ visibility: next }).eq("id", note.id);
    if (error) return alert(error.message);
    patch({ visibility: next });
  }

  async function remove() {
    if (!confirm(`Delete the note “${note.title}”?`)) return;
    const { error } = await supabaseBrowser().from("notes").delete().eq("id", note.id);
    if (error) return alert(error.message);
    setNotes((list) => list.filter((n) => n.id !== note.id));
  }

  const author = isOwner ? "you" : (people[note.owner_id] ?? "someone");
  const editor = note.updated_by && note.updated_by !== note.owner_id ? (people[note.updated_by] ?? "someone") : null;

  return (
    <article className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm" title={`Note by ${people[note.owner_id] ?? "someone"}`}>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
            {(people[note.owner_id] ?? "?").slice(0, 1).toUpperCase()}
          </span>
          <span className="text-muted">by</span>
          <b>{author}</b>
        </span>
        {note.visibility === "private" ? (
          <span className="chip text-medium" title="Only you can see this note">
            <Lock size={12} /> Private
          </span>
        ) : (
          <span className="chip" title="Everyone can see and edit this note">
            <Globe size={12} /> Public
          </span>
        )}
        <span className="text-xs text-muted">
          {editor ? `edited by ${note.updated_by === profile.id ? "you" : editor} ` : "updated "}
          {timeAgo(note.updated_at)}
        </span>
        {isOwner && (
          <span className="ml-auto flex items-center gap-1">
            <button className="btn-ghost py-1 text-xs" onClick={toggleVisibility}>
              {note.visibility === "public" ? <Lock size={14} /> : <Globe size={14} />}
              Make {note.visibility === "public" ? "private" : "public"}
            </button>
            <button className="btn-ghost py-1 hover:text-hard" onClick={remove} title="Delete note">
              <Trash2 size={14} />
            </button>
          </span>
        )}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        disabled={!canEdit}
        className="w-full rounded-md bg-transparent px-1 py-0.5 text-base font-semibold outline-none hover:bg-surface-2 focus:bg-surface-2"
        aria-label="Note title"
      />
      <DocEditor
        value={note.content}
        version={note.docVersion}
        editable={canEdit}
        onSave={saveContent}
        placeholder="Write your note… paste screenshots, drop PDFs, add code blocks."
        minHeight="10rem"
      />
    </article>
  );
}
