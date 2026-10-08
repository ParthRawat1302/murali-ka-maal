import StarterKit from "@tiptap/starter-kit";
import Code from "@tiptap/extension-code";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import { common, createLowlight } from "lowlight";
import { FileAttachment } from "./file-attachment";

const lowlight = createLowlight(common);

// LeetCode constraints put <sup> inside <code> (e.g. 10<sup>4</sup>), so inline code allows other marks.
const InlineCode = Code.extend({ excludes: "" });

/** Schema shared by the web editor and scripts/import-question.ts. */
export function baseExtensions() {
  return [
    StarterKit.configure({
      code: false,
      codeBlock: false,
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      },
    }),
    InlineCode,
    Image.configure({ inline: false, allowBase64: false }),
    TableKit.configure({ table: { resizable: false } }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    Superscript,
    Subscript,
    FileAttachment,
  ];
}
