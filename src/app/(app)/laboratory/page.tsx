import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Laboratory" }

export default function LaboratoryPage() {
  return (
    <>
      <PageHeader title="Laboratory" description="Test orders, samples and results." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Test order queue by priority",
            "Sample tracking from collection to result",
            "Result entry with reference ranges",
          ]}
        />
      </div>
    </>
  )
}
