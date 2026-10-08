import Link from "next/link";
import { formatDay } from "@/lib/dates";
import { sourceTypeLabel, type Intent } from "@/lib/types";

export function intentSource(i: Intent) {
  return `${i.source_label ?? sourceTypeLabel(i.source_type)} · ${formatDay(i.source_date, true)}`;
}

/** Intended topics first (in the order they were given), then the rest alphabetically. */
export function orderTopics(topics: string[], intents: Intent[]) {
  const intended = new Map<string, Intent[]>();
  for (const i of intents) intended.set(i.topic, [...(intended.get(i.topic) ?? []), i]);
  const rest = topics.filter((t) => !intended.has(t)).sort();
  return [
    ...[...intended].map(([name, by]) => ({ name, intents: by })),
    ...rest.map((name) => ({ name, intents: [] as Intent[] })),
  ];
}

export function TopicChips({
  topics,
  intents,
  mobileLimit,
  link = false,
}: {
  topics: string[];
  intents: Intent[];
  /** on phones, show only this many chips plus "+n" */
  mobileLimit?: number;
  link?: boolean;
}) {
  const all = orderTopics(topics, intents);
  return (
    <>
      {all.map(({ name, intents: by }, i) => {
        const className = [
          by.length ? "chip-intended" : "chip",
          mobileLimit !== undefined && i >= mobileLimit ? "hidden sm:inline-flex" : "",
          link ? "hover:text-fg" : "",
        ].join(" ");
        const title = by.length ? `Intended method\n${by.map(intentSource).join("\n")}` : undefined;
        return link ? (
          <Link key={name} href={`/?topics=${encodeURIComponent(name)}`} className={className} title={title}>
            {name}
          </Link>
        ) : (
          <span key={name} className={className} title={title}>
            {name}
          </span>
        );
      })}
      {mobileLimit !== undefined && all.length > mobileLimit && (
        <span className="chip sm:hidden">+{all.length - mobileLimit}</span>
      )}
    </>
  );
}
