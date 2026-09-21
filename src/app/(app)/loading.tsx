import {
  DashboardSkeleton,
  PeriodFilterSkeleton,
} from "@/components/skeletons/dashboard-skeleton"
import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton"

/**
 * The dashboard greets the user by name, which is not known until the profile
 * loads, so the title is placeheld. The description under it is fixed copy.
 */
export default function DashboardLoading() {
  return (
    <>
      <PageHeaderSkeleton
        titleWidth="w-48"
        description="PMC · Paeds Medical Complex"
        actions={<PeriodFilterSkeleton />}
      />
      <DashboardSkeleton />
    </>
  )
}
