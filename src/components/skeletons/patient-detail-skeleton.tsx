import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

/** One field in the Details grid: a small label over a value. */
function DetailSkeleton({ width, delay }: { width: string; delay: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <SkeletonLine line="h-5" bar="h-3" width="w-20" delay={delay} />
      <SkeletonLine line="h-6" bar="h-4" width={width} delay={delay + 0.04} />
    </div>
  )
}

/**
 * Mirrors StayCard: the ward and dates on the left, the running bill on the
 * right, and the charge table underneath.
 */
function StayCardSkeleton({ delay }: { delay: number }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* Ward name is text-lg, with an outcome badge beside it. */}
          <span className="flex h-7 items-center gap-2.5">
            <Skeleton className="h-5 w-32" delay={delay} />
            <Skeleton className="h-5 w-24 rounded-md" delay={delay + 0.04} />
          </span>
          <SkeletonLine line="h-6" bar="h-4" width="w-64" delay={delay + 0.08} />
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <SkeletonLine line="h-5" bar="h-3" width="w-20" delay={delay + 0.12} align="right" />
          {/* text-2xl */}
          <SkeletonLine line="h-8" bar="h-6" width="w-28" delay={delay + 0.16} align="right" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-base">
          <caption className="sr-only">Loading charges for this stay</caption>
          <thead>
            <tr className="border-b border-border text-left">
              {/* Headings are fixed copy. */}
              <th scope="col" className="py-2 pr-4 font-medium">Charge</th>
              <th scope="col" className="py-2 pr-4 font-medium">Dates</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Days</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Rate a day</th>
              <th scope="col" className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 2 }, (_, row) => (
              <tr key={row} className="border-b border-border/60 last:border-b-0">
                <td className="py-2 pr-4">
                  <SkeletonLine line="h-6" bar="h-4" width="w-28" delay={delay + 0.2 + row * 0.08} />
                </td>
                <td className="py-2 pr-4">
                  <SkeletonLine line="h-6" bar="h-4" width="w-36" delay={delay + 0.23 + row * 0.08} />
                </td>
                <td className="py-2 pr-4">
                  <SkeletonLine line="h-6" bar="h-4" width="w-8" align="right" delay={delay + 0.26 + row * 0.08} />
                </td>
                <td className="py-2 pr-4">
                  <SkeletonLine line="h-6" bar="h-4" width="w-20" align="right" delay={delay + 0.29 + row * 0.08} />
                </td>
                <td className="py-2">
                  <SkeletonLine line="h-6" bar="h-4" width="w-24" align="right" delay={delay + 0.32 + row * 0.08} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

export function PatientDetailSkeleton() {
  // The seven fields the real page shows, at roughly their real widths.
  const fields = ["w-28", "w-20", "w-24", "w-16", "w-32", "w-28", "w-40"]

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
      <span role="status" aria-live="polite" className="sr-only">
        Loading this patient…
      </span>

      <section className="rounded-xl surface p-4 sm:p-5">
        {/* Fixed copy. */}
        <h2 className="mb-3 text-base font-semibold tracking-tight">Details</h2>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((width, index) => (
            <DetailSkeleton key={width + index} width={width} delay={index * 0.06} />
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        {/* The count is not known yet, so the heading arrives without it - the
            line height is the same either way, so nothing moves. */}
        <h2 className="text-base font-semibold tracking-tight">Stays</h2>
        <StayCardSkeleton delay={0.3} />
      </section>
    </div>
  )
}
