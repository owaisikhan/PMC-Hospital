import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Patients" }

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" description="Child records and visit history." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Register a child with MRN, father's name, date of birth and guardian phone",
            "Searchable list with age shown in days, months or years",
            "Patient detail with admission and lab history",
          ]}
        />
      </div>
    </>
  )
}
