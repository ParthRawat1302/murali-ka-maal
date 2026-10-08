"use client";

import { useRef, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  CodeSquare,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Paperclip,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Underline,
  Undo2,
} from "lucide-react";

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm transition disabled:opacity-40 ${
        active ? "bg-accent/20 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px bg-border" />;

export function Toolbar({ editor, onFiles }: { editor: Editor; onFiles: (files: File[]) => void }) {
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const c = () => editor.chain().focus();

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function pick(input: HTMLInputElement | null) {
    if (!input) return;
    input.value = "";
    input.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-2 py-1.5">
      <Btn title="Undo" onClick={() => c().undo().run()} disabled={!s.canUndo}>
        <Undo2 size={16} />
      </Btn>
      <Btn title="Redo" onClick={() => c().redo().run()} disabled={!s.canRedo}>
        <Redo2 size={16} />
      </Btn>
      <Sep />
      <Btn title="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </Btn>
      <Btn title="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={16} />
      </Btn>
      <Btn title="Heading 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={16} />
      </Btn>
      <Sep />
      <Btn title="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold size={16} />
      </Btn>
      <Btn title="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic size={16} />
      </Btn>
      <Btn title="Underline (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <Underline size={16} />
      </Btn>
      <Btn title="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <Strikethrough size={16} />
      </Btn>
      <Btn title="Inline code" active={s.code} onClick={() => c().toggleCode().run()}>
        <Code size={16} />
      </Btn>
      <Btn title="Link" active={s.link} onClick={setLink}>
        <Link2 size={16} />
      </Btn>
      <Sep />
      <Btn title="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List size={16} />
      </Btn>
      <Btn title="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered size={16} />
      </Btn>
      <Btn title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote size={16} />
      </Btn>
      <Btn title="Code block" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()}>
        <CodeSquare size={16} />
      </Btn>
      <Btn title="Divider" onClick={() => c().setHorizontalRule().run()}>
        <Minus size={16} />
      </Btn>
      <Btn
        title="Insert table"
        active={s.table}
        onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table size={16} />
      </Btn>
      <Sep />
      <Btn title="Insert image" onClick={() => pick(imageInput.current)}>
        <ImagePlus size={16} />
      </Btn>
      <Btn title="Attach file" onClick={() => pick(fileInput.current)}>
        <Paperclip size={16} />
      </Btn>
      {s.table && (
        <>
          <Sep />
          <Btn title="Add row below" onClick={() => c().addRowAfter().run()}>
            <span className="text-xs">+Row</span>
          </Btn>
          <Btn title="Add column right" onClick={() => c().addColumnAfter().run()}>
            <span className="text-xs">+Col</span>
          </Btn>
          <Btn title="Delete row" onClick={() => c().deleteRow().run()}>
            <span className="text-xs">−Row</span>
          </Btn>
          <Btn title="Delete column" onClick={() => c().deleteColumn().run()}>
            <span className="text-xs">−Col</span>
          </Btn>
          <Btn title="Delete table" onClick={() => c().deleteTable().run()}>
            <span className="text-xs text-hard">×Table</span>
          </Btn>
        </>
      )}
      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files && onFiles(Array.from(e.target.files))}
      />
    </div>
  );
}
