import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Appointments" }

export default function AppointmentsPage() {
  return (
    <>
      <PageHeader title="Appointments" description="Scheduling across departments and doctors." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Day, week and doctor-column calendar views",
            "Booking dialog with conflict detection",
            "Check-in and no-show handling",
          ]}
        />
      </div>
    </>
  )
}
