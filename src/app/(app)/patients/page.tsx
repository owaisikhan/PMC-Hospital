import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Patients" }

export default function PatientsPage() {
  return (
    <>
      <PageHeader title="Patients" description="Patient records, admissions and history." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Searchable patient list with MRN, age, ward and status",
            "Patient detail view with visit timeline and vitals",
            "Admission and discharge flows",
          ]}
        />
      </div>
    </>
  )
}
