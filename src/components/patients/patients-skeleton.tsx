import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

/**
 * Mirrors the real patient row: the name block on the left, then MRN, Age,
 * Gender, Phone and Current bill at the same fixed widths, and the chevron.
 *
 * Rows with a father's name are 54px tall in the name block and rows without
 * are shorter, so the real list is not perfectly uniform either; the skeleton
 * matches the common case, which is the one the register form encourages.
 */
function PatientRowSkeleton({ delay }: { delay: number }) {
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3.5">
      {/* gap-0.5 and the two line heights match the real name block exactly. */}
      <div className="flex min-w-[15rem] flex-1 flex-col gap-0.5">
        <SkeletonLine line="h-7" bar="h-5" width="w-44" delay={delay} />
        <SkeletonLine line="h-6" bar="h-4" width="w-32" delay={delay + 0.05} />
      </div>

      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {[
          { label: "w-10", value: "w-32", box: "w-36" },
          { label: "w-8", value: "w-16", box: "w-24" },
          { label: "w-12", value: "w-14", box: "w-20" },
          { label: "w-10", value: "w-28", box: "w-32" },
          { label: "w-16", value: "w-20", box: "w-28" },
        ].map((column, index) => (
          <div key={column.box} className={`flex flex-col ${column.box}`}>
            {/* dt is text-sm, dd is text-base. */}
            <SkeletonLine
              line="h-5"
              bar="h-3"
              width={column.label}
              delay={delay + index * 0.05}
            />
            <SkeletonLine
              line="h-6"
              bar="h-4"
              width={column.value}
              delay={delay + index * 0.05 + 0.05}
            />
          </div>
        ))}
      </dl>

      <Skeleton className="size-5 shrink-0 rounded-full" delay={delay + 0.3} />
    </li>
  )
}

export function PatientsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Loading patients"
      className="flex flex-col gap-4"
    >
      <span className="sr-only">Loading patients…</span>

      {/* Filter chips and the search box, at their real sizes. The chip group
          is 46px, not the 44px of the other controls, because it has a border
          and half a unit of padding around the chips - measured, not guessed,
          and 2px here shifts the whole list. Its width is fixed by the two
          labels, which are fixed copy. */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-[2.875rem] w-[15.625rem] rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg sm:max-w-md" delay={0.08} />
      </div>

      <ul className="flex flex-col gap-2">
        {Array.from({ length: rows }, (_, index) => (
          // Each row starts a little later, so the list fills in as one sweep.
          <PatientRowSkeleton key={index} delay={index * 0.12} />
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" delay={0.5} />
      </div>
    </div>
  )
}
