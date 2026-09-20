import { PageHeader } from "@/components/layout/page-header"
import { PatientsSkeleton } from "@/components/patients/patients-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Shown by the App Router while the patients query runs. The title and
 * description are known before any data arrives, so they render for real and
 * only the parts that depend on the database are placeheld - the page does not
 * shift when the rows land.
 */
export default function PatientsLoading() {
  return (
    <>
      <PageHeader
        title="Patients"
        description="Every patient registered at PMC, and who is admitted right now."
        actions={
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-11 w-44 rounded-lg" />
            <Skeleton className="h-11 w-40 rounded-lg" delay={0.08} />
          </div>
        }
      />

      <div className="px-4 py-6 sm:px-6">
        <PatientsSkeleton />
      </div>
    </>
  )
}
