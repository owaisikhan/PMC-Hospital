import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Admissions" }

export default function AdmissionsPage() {
  return (
    <>
      <PageHeader title="Admissions" description="Ward admissions and daily care charges." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Admit a child to Emergency, NICU, PICU, Measles or General ward",
            "Add CPAP or ventilator support for specific dates, stacking on the ward charge",
            "Live bill that recalculates as the stay continues",
            "Discharge with a final itemised total",
          ]}
        />
      </div>
    </>
  )
}
