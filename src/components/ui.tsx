import type { Difficulty, SourceType } from "@/lib/types";
import { sourceTypeLabel } from "@/lib/types";
import { formatDay } from "@/lib/dates";

export function LeetCodeLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FFA116"
        d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0z"
      />
      <path
        fill="currentColor"
        d="M20.811 13.01H10.666c-.702 0-1.27.604-1.27 1.346s.568 1.346 1.27 1.346h10.145c.701 0 1.27-.604 1.27-1.346s-.569-1.346-1.27-1.346z"
      />
    </svg>
  );
}

const DIFF_CLASS: Record<Difficulty, string> = {
  easy: "text-easy",
  medium: "text-medium",
  hard: "text-hard",
};

export function DifficultyPill({ d }: { d: Difficulty }) {
  return <span className={`text-sm font-medium capitalize ${DIFF_CLASS[d]}`}>{d === "medium" ? "Med." : d}</span>;
}

export function SourceBadge({
  type,
  label,
  date,
}: {
  type: SourceType;
  label: string | null;
  date: string;
}) {
  // "Email" / "Class notes" in slightly larger bold text, then the label or date
  const kind = sourceTypeLabel(type);
  const detail = type === "class_notes" ? formatDay(date, true) : label;
  const text = detail ? `${kind}: ${detail}` : kind;
  return (
    <span
      className="inline-flex min-w-0 max-w-[18rem] items-baseline rounded-md border border-border px-1.5 py-0.5 text-xs text-muted"
      title={text}
    >
      <b className="shrink-0 text-[13px] font-semibold text-fg">{kind}</b>
      {detail && <span className="truncate">:&nbsp;{detail}</span>}
    </span>
  );
}
