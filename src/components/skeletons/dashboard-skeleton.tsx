"use client"

import { useRole } from "@/components/layout/role-context"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

/** Mirrors StatCard: label, a 2xl figure, and a trend line, with the icon tile. */
function StatCardSkeleton({ delay }: { delay: number }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="flex flex-col gap-1">
          <SkeletonLine line="h-5" bar="h-3.5" width="w-36" delay={delay} />
          <SkeletonLine line="h-8" bar="h-6" width="w-12" delay={delay + 0.05} />
          <SkeletonLine line="h-4" bar="h-3" width="w-28" delay={delay + 0.1} />
        </div>
        <Skeleton className="size-10 rounded-[0.6875rem]" delay={delay + 0.15} />
      </CardContent>
    </Card>
  )
}

/**
 * Mirrors RevenueCard. The money line is text-xl below sm and text-2xl above,
 * so the line box changes with it - otherwise the card is 4px short on a
 * phone and the grid shifts when the figures land.
 */
function RevenueCardSkeleton({ meter, delay }: { meter: boolean; delay: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-5">
        <div className="flex items-start justify-between gap-3">
          <SkeletonLine line="h-5" bar="h-3.5" width="w-28" delay={delay} />
          <Skeleton className="size-9 shrink-0 rounded-[0.625rem]" delay={delay + 0.05} />
        </div>
        <SkeletonLine
          line="h-7 sm:h-8"
          bar="h-6"
          width="w-32"
          delay={delay + 0.1}
        />
        {meter ? (
          <div className="flex items-center gap-2">
            <Skeleton className="h-1.5 flex-1 rounded-full" delay={delay + 0.15} />
            <SkeletonLine line="h-4" bar="h-3" width="w-8" delay={delay + 0.2} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DashboardSkeleton() {
  const role = useRole()
  const isAdmin = role === "admin"

  // Admins get a Record Expense tile, so the grid is one wider for them.
  const tiles = isAdmin ? 5 : 4

  return (
    <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
      <span role="status" aria-live="polite" className="sr-only">
        Loading the dashboard…
      </span>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCardSkeleton delay={0} />
        <StatCardSkeleton delay={0.12} />
      </div>

      {/* Money is admin-only. The role comes from the layout, which has already
          resolved, so this matches the page that replaces it instead of
          flashing cards a staff member will never be shown. */}
      {isAdmin ? (
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <SkeletonLine line="h-6" bar="h-4" width="w-44" delay={0.2} />
            <SkeletonLine line="h-5" bar="h-3" width="w-24" delay={0.24} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <RevenueCardSkeleton meter delay={0.28} />
            <RevenueCardSkeleton meter delay={0.36} />
            <RevenueCardSkeleton meter delay={0.44} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <RevenueCardSkeleton meter={false} delay={0.52} />
            <RevenueCardSkeleton meter={false} delay={0.58} />
            <RevenueCardSkeleton meter={false} delay={0.64} />
            <RevenueCardSkeleton meter={false} delay={0.7} />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl surface p-5">
        {/* Fixed copy, so it renders for real. */}
        <h2 className="mb-4 text-base font-semibold tracking-tight">Quick Actions</h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: tiles }, (_, index) => (
            <li key={index} className="flex flex-col items-center gap-1.5">
              <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-accent px-3 py-5">
                <Skeleton className="size-13 rounded-[0.875rem]" delay={0.7 + index * 0.08} />
                <SkeletonLine
                  line="h-5"
                  bar="h-3.5"
                  width="w-20"
                  delay={0.74 + index * 0.08}
                />
              </div>
              {/* Only the first tile carries a caption on the real page. */}
              {index === 0 ? (
                <SkeletonLine line="h-4" bar="h-3" width="w-28" delay={0.8} />
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

/**
 * The period filter is admin-only, so the placeholder for it is too. Rendering
 * it for everyone would put a control in a staff member's header that the real
 * page then takes away.
 */
export function PeriodFilterSkeleton() {
  const role = useRole()
  if (role !== "admin") return null
  return <Skeleton className="h-[2.875rem] w-[17.5rem] rounded-lg" />
}
