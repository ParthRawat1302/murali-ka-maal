import { Node } from "@tiptap/core";

export function formatBytes(n: number | null | undefined) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function extOf(name: string) {
  const m = /\.([a-z0-9]{1,5})$/i.exec(name);
  return m ? m[1].toUpperCase() : "FILE";
}

/** A block-level chip linking to an uploaded file (pdf, docx, code…). */
export const FileAttachment = Node.create({
  name: "fileAttachment",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      href: { default: null, rendered: false },
      name: { default: "file", rendered: false },
      size: { default: null, rendered: false },
      mime: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-file-attachment]",
        priority: 1000,
        getAttrs: (el) => {
          const size = Number((el as HTMLElement).getAttribute("data-size"));
          return {
            href: (el as HTMLElement).getAttribute("href"),
            name: (el as HTMLElement).getAttribute("data-name") || (el as HTMLElement).textContent || "file",
            size: Number.isFinite(size) && size > 0 ? size : null,
            mime: (el as HTMLElement).getAttribute("data-mime"),
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { href, name, size, mime } = node.attrs as { href: string; name: string; size: number | null; mime: string | null };
    return [
      "a",
      {
        "data-file-attachment": "",
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        class: "file-chip",
        "data-name": name,
        "data-size": size ?? "",
        "data-mime": mime ?? "",
        title: `Open ${name}`,
      },
      ["span", { class: "file-chip-icon" }, extOf(name)],
      ["span", { class: "file-chip-name" }, name],
      ["span", { class: "file-chip-size" }, formatBytes(size)],
    ];
  },
});
