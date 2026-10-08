import { Line } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-7 w-44" />
        <Line className="w-80" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-17 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-48 rounded-xl" />
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-36 w-44 shrink-0 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
