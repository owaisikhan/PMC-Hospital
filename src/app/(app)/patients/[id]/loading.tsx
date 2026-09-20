import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton"
import { PatientDetailSkeleton } from "@/components/skeletons/patient-detail-skeleton"

/**
 * Both the title and the description are this patient's own data - their name,
 * MRN and age - so both are placeheld. The back link is fixed copy and is
 * rendered for real, so it works while the rest is still loading.
 */
export default function PatientLoading() {
  return (
    <>
      <PageHeaderSkeleton
        titleWidth="w-52"
        descriptionWidth="w-44"
        actions={
          <Link
            href="/patients"
            className="flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-base font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4.5" aria-hidden />
            All patients
          </Link>
        }
      />
      <PatientDetailSkeleton />
    </>
  )
}
