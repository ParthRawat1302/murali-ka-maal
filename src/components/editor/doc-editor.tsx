"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor, type JSONContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { AlertTriangle, Check, CloudOff, Loader2 } from "lucide-react";
import { baseExtensions } from "@/lib/editor/extensions";
import { uploadFile } from "@/lib/upload";
import { useApp } from "@/components/app-context";
import { Lightbox } from "./lightbox";
import { Toolbar } from "./toolbar";

type Status = "idle" | "unsaved" | "saving" | "saved" | "error";

export type DocEditorProps = {
  /** Server content (TipTap JSON or HTML). Changes to it are treated as remote updates. */
  value: JSONContent | string | null;
  /** Server version (updated_at). A new version from someone else reloads the doc. */
  version?: string;
  editable?: boolean;
  placeholder?: string;
  /** Autosave handler; returns the new server version. */
  onSave?: (doc: JSONContent | null) => Promise<string | undefined>;
  /** Called on every change (for forms that save on submit). */
  onChange?: (doc: JSONContent | null) => void;
  className?: string;
  minHeight?: string;
};

const SAVE_DELAY_MS = 1000;

function sameDoc(a: unknown, b: unknown) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

export function DocEditor({
  value,
  version,
  editable = true,
  placeholder = "Write here… paste or drop images and files anywhere.",
  onSave,
  onChange,
  className = "",
  minHeight = "8rem",
}: DocEditorProps) {
  const { profile } = useApp();
  const [status, setStatus] = useState<Status>("idle");
  const [uploading, setUploading] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const lastVersion = useRef(version);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  });

  const currentDoc = useCallback((): JSONContent | null => {
    const ed = editorRef.current;
    if (!ed || ed.isEmpty) return null;
    return ed.getJSON();
  }, []);

  const save = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inflight.current) await inflight.current;
    if (!dirty.current || !onSaveRef.current) return;
    dirty.current = false;
    setStatus("saving");
    const run = (async () => {
      try {
        const v = await onSaveRef.current!(currentDoc());
        if (v) lastVersion.current = v;
        setStatus(dirty.current ? "unsaved" : "saved");
      } catch (e) {
        console.error(e);
        dirty.current = true;
        setStatus("error");
      }
    })();
    inflight.current = run;
    await run;
    inflight.current = null;
  }, [currentDoc]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  }, [save]);

  const insertFiles = useCallback(
    async (files: File[], pos?: number) => {
      const ed = editorRef.current;
      if (!ed || !files.length) return;
      setUploading((n) => n + files.length);
      try {
        const results = await Promise.allSettled(files.map((f) => uploadFile(f, profile.id)));
        const nodes: JSONContent[] = [];
        for (const r of results) {
          if (r.status === "rejected") {
            alert(`Upload failed: ${r.reason?.message ?? r.reason}`);
            continue;
          }
          const u = r.value;
          nodes.push(
            u.mime.startsWith("image/")
              ? { type: "image", attrs: { src: u.url, alt: u.name } }
              : { type: "fileAttachment", attrs: { href: u.url, name: u.name, size: u.size, mime: u.mime } },
          );
          nodes.push({ type: "paragraph" });
        }
        if (!nodes.length) return;
        const chain = ed.chain().focus();
        (pos != null ? chain.insertContentAt(pos, nodes) : chain.insertContent(nodes)).run();
      } finally {
        setUploading((n) => n - files.length);
      }
    },
    [profile.id],
  );

  const editor = useEditor({
    extensions: [...baseExtensions(), Placeholder.configure({ placeholder })],
    content: value ?? "",
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "doc px-4 py-3", style: `min-height:${minHeight}` },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        insertFiles(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertFiles(files, pos);
        return true;
      },
      handleClickOn: (view, _pos, node, _nodePos, event) => {
        if (node.type.name === "fileAttachment") {
          event.preventDefault();
          window.open(node.attrs.href, "_blank", "noopener,noreferrer");
          return true;
        }
        if (node.type.name === "image" && !view.editable) {
          setLightbox(node.attrs.src);
          return true;
        }
        return false;
      },
      handleDoubleClickOn: (_view, _pos, node) => {
        if (node.type.name === "image") {
          setLightbox(node.attrs.src);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: ed }) => {
      onChangeRef.current?.(ed.isEmpty ? null : ed.getJSON());
    },
    onUpdate: () => {
      dirty.current = true;
      onChangeRef.current?.(currentDoc());
      if (onSaveRef.current) {
        setStatus("unsaved");
        schedule();
      }
    },
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    // emitUpdate=false: toggling edit mode must not count as an edit (or trigger an autosave)
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  // Remote changes from someone else.
  useEffect(() => {
    if (!editor || version === undefined || version === lastVersion.current) return;
    if (sameDoc(value, currentDoc())) {
      lastVersion.current = version;
      return;
    }
    if (dirty.current) {
      setConflict(true);
      return;
    }
    lastVersion.current = version;
    editor.commands.setContent(value ?? "", { emitUpdate: false });
  }, [editor, value, version, currentDoc]);

  // Flush on unmount, warn on unload while dirty.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current && onSaveRef.current) {
        save();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (dirty.current) save();
    };
  }, [save]);

  function loadTheirs() {
    if (!editor) return;
    dirty.current = false;
    if (timer.current) clearTimeout(timer.current);
    lastVersion.current = version;
    editor.commands.setContent(value ?? "", { emitUpdate: false });
    setConflict(false);
    setStatus("saved");
  }

  function keepMine() {
    lastVersion.current = version;
    setConflict(false);
    dirty.current = true;
    save();
  }

  return (
    <div className={`overflow-clip ${editable ? "rounded-xl border border-border bg-surface" : ""} ${className}`}>
      {editable && editor && (
        <div className="sticky top-14 z-10 rounded-t-xl bg-surface">
          <Toolbar editor={editor} onFiles={(f) => insertFiles(f)} />
        </div>
      )}
      {conflict && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-medium/10 px-4 py-2 text-sm">
          <AlertTriangle size={16} className="text-medium" />
          <span>Someone else saved a newer version while you were typing.</span>
          <button className="btn ml-auto py-1" onClick={loadTheirs}>
            Load theirs
          </button>
          <button className="btn py-1" onClick={keepMine}>
            Keep mine
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
      {editable && (onSave || uploading > 0) && (
        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-1.5 text-xs text-muted">
          {uploading > 0 && (
            <span className="flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" /> Uploading {uploading}…
            </span>
          )}
          {onSave && <SaveStatus status={status} />}
        </div>
      )}
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

function SaveStatus({ status }: { status: Status }) {
  switch (status) {
    case "saving":
      return (
        <span className="flex items-center gap-1">
          <Loader2 size={12} className="animate-spin" /> Saving…
        </span>
      );
    case "saved":
      return (
        <span className="flex items-center gap-1 text-easy">
          <Check size={12} /> Saved
        </span>
      );
    case "unsaved":
      return <span>Unsaved changes</span>;
    case "error":
      return (
        <span className="flex items-center gap-1 text-hard">
          <CloudOff size={12} /> Couldn&apos;t save, retrying on next edit
        </span>
      );
    default:
      return <span>All changes autosave</span>;
  }
}
