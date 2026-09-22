import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

/**
 * Mirrors the balance summary under each bill: three or four figures in a row,
 * the last one larger because it is the amount still owed.
 */
function BalanceSummarySkeleton({ delay }: { delay: number }) {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
      {["w-20", "w-16"].map((width, index) => (
        <div key={width} className="flex flex-col gap-0.5">
          <SkeletonLine line="h-5" bar="h-3" width="w-16" delay={delay + index * 0.05} />
          <SkeletonLine line="h-7" bar="h-5" width={width} delay={delay + index * 0.05 + 0.04} />
        </div>
      ))}
      <div className="flex flex-col gap-0.5">
        <SkeletonLine line="h-5" bar="h-3" width="w-20" delay={delay + 0.1} />
        {/* text-2xl, so an h-8 line box. */}
        <SkeletonLine line="h-8" bar="h-6" width="w-28" delay={delay + 0.14} />
      </div>
    </div>
  )
}

/** One family's bill. */
function BillSkeleton({ delay }: { delay: number }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          {/* Name is text-lg, with a status badge beside it. */}
          <span className="flex h-7 items-center gap-2.5">
            <Skeleton className="h-5 w-44" delay={delay} />
            <Skeleton className="h-5 w-20 rounded-md" delay={delay + 0.04} />
          </span>
          <SkeletonLine line="h-6" bar="h-4" width="w-72" delay={delay + 0.08} />
        </div>
      </div>

      <BalanceSummarySkeleton delay={delay + 0.12} />

      {/* Most bills carry at least one payment, and the list adds about 90px
          to the card. Leaving it out made every placeholder card shorter than
          the bill that replaced it. */}
      <div className="flex flex-col gap-2">
        <SkeletonLine line="h-6" bar="h-4" width="w-24" delay={delay + 0.2} />
        <ul className="flex flex-col gap-1.5">
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/60 px-3 py-2.5">
            <SkeletonLine line="h-6" bar="h-4" width="w-20" delay={delay + 0.24} />
            <SkeletonLine line="h-6" bar="h-4" width="w-14" delay={delay + 0.26} />
            <SkeletonLine line="h-6" bar="h-4" width="w-20" delay={delay + 0.28} />
          </li>
        </ul>
      </div>

      {/* The action row: record a payment, and a concession for admins. */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-11 w-40 rounded-lg" delay={delay + 0.3} />
        <Skeleton className="h-11 w-36 rounded-lg" delay={delay + 0.34} />
      </div>
    </article>
  )
}

export function BillingSkeleton({ bills = 3 }: { bills?: number }) {
  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        Loading bills…
      </span>
      <SkeletonLine line="h-6" bar="h-4" width="w-80" />
      {Array.from({ length: bills }, (_, index) => (
        <BillSkeleton key={index} delay={index * 0.14} />
      ))}

      {/* The count and pager row below the list. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SkeletonLine line="h-6" bar="h-4" width="w-40" delay={0.5} />
        <div className="flex gap-2">
          <Skeleton className="h-11 w-28 rounded-lg" delay={0.54} />
          <Skeleton className="h-11 w-20 rounded-lg" delay={0.58} />
        </div>
      </div>
    </>
  )
}
