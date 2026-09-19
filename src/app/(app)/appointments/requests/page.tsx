import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Requests" }

export default function AppointmentRequestsPage() {
  return (
    <>
      <PageHeader title="Requests" description="Incoming appointment requests awaiting confirmation." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Request inbox with accept, reschedule and decline",
            "Auto-assignment by department and availability",
          ]}
        />
      </div>
    </>
  )
}
