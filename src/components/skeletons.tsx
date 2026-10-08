// Shimmer placeholders shaped like the real pages, so content fades in where it will appear.

export function Line({ className = "" }: { className?: string }) {
  return <div className={`skeleton h-3 ${className}`} />;
}

export function QuestionListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-border overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 sm:px-4">
          <div className="skeleton h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Line className={i % 3 === 0 ? "w-2/3" : i % 3 === 1 ? "w-1/2" : "w-3/5"} />
            <div className="flex gap-1.5">
              <div className="skeleton h-4 w-28 rounded-full" />
              <div className="skeleton h-4 w-16 rounded-full" />
              <div className="skeleton hidden h-4 w-20 rounded-full sm:block" />
            </div>
          </div>
          <div className="skeleton hidden h-4 w-10 sm:block" />
          <div className="skeleton h-6 w-6 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card flex flex-col items-center gap-6 p-5 sm:flex-row">
          <div className="skeleton h-32 w-32 shrink-0 rounded-full" />
          <div className="grid w-full grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-28 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="card space-y-3 p-5">
          <Line className="w-1/2" />
          <div className="skeleton h-28 w-full" />
        </div>
      </div>
      <div className="card flex flex-wrap gap-2 p-3">
        <div className="skeleton h-9 min-w-48 flex-1 rounded-lg" />
        <div className="skeleton h-9 w-56 rounded-lg" />
        <div className="skeleton h-9 w-40 rounded-lg" />
      </div>
      <QuestionListSkeleton />
    </div>
  );
}

export function QuestionSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Line className="h-4 w-28" />
      <div className="card flex items-start gap-3 p-4 sm:p-5">
        <div className="skeleton mt-1 h-6 w-6 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-6 w-2/3" />
          <div className="flex flex-wrap gap-2">
            <div className="skeleton h-5 w-12" />
            <div className="skeleton h-5 w-40" />
            <div className="skeleton h-5 w-20 rounded-full" />
            <div className="skeleton h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-4 border-b border-border pb-2">
        <Line className="h-4 w-20" />
        <Line className="h-4 w-16" />
        <Line className="h-4 w-16" />
      </div>
      <div className="card space-y-3 p-5">
        <Line className="w-full" />
        <Line className="w-11/12" />
        <Line className="w-4/5" />
        <div className="skeleton h-24 w-full" />
        <Line className="w-3/4" />
        <Line className="w-2/3" />
      </div>
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-2">
        <div className="skeleton h-7 w-40" />
        <Line className="w-48" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <div className="skeleton h-9 w-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Line className="h-4 w-28" />
              <Line className="h-4 w-14" />
            </div>
            <div className="skeleton h-2 w-full rounded-full" />
            <Line className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="skeleton h-7 w-48" />
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <Line className="w-24" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <div className="card skeleton h-48" />
    </div>
  );
}
