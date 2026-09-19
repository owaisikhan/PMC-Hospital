import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Admitted" }

export default function AdmittedPatientsPage() {
  return (
    <>
      <PageHeader title="Admitted" description="Currently admitted inpatients." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Inpatients grouped by ward and bed",
            "Length-of-stay and attending doctor columns",
            "Discharge checklist",
          ]}
        />
      </div>
    </>
  )
}
