import {
  AddLabButton,
  AddTestButton,
  EditLabButton,
  EditTestButton,
  type LabRecord,
  type LabTestRecord,
} from "@/components/laboratory/lab-management-dialogs"
import { Badge } from "@/components/ui/badge"
import { formatPKR } from "@/lib/format"

/** Admin only — this is where charge_price and cost_price live. */
export function LabsSection({
  labs,
  tests,
}: {
  labs: LabRecord[]
  tests: LabTestRecord[]
}) {
  const labById = new Map(labs.map((lab) => [lab.id, lab]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Labs</h2>
          <AddLabButton />
        </div>
        <div className="overflow-hidden rounded-xl surface">
          <table className="w-full border-collapse text-base">
            <caption className="sr-only">Outside labs PMC sends samples to</caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {labs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No labs yet. Add one before adding a test.
                  </td>
                </tr>
              ) : (
                labs.map((lab) => (
                  <tr key={lab.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{lab.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={lab.isActive ? "success" : "neutral"}>
                        {lab.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <EditLabButton lab={lab} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Tests</h2>
          <AddTestButton labs={labs} />
        </div>
        <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
          <table className="w-full min-w-[42rem] border-collapse text-base">
            <caption className="sr-only">
              Every test PMC offers, its lab, and both prices
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="px-4 py-3 font-medium">
                  Test
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Lab
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Charge to patient
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Cost to PMC
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No tests yet.
                  </td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test.id} className="border-b border-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium">{test.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {test.labId ? (labById.get(test.labId)?.name ?? "—") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                      {formatPKR(test.chargePrice)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatPKR(test.costPrice)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={test.isActive ? "success" : "neutral"}>
                        {test.isActive ? "Offered" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <EditTestButton test={test} labs={labs} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          The margin on each test is what the patient is charged minus what the lab
          bills PMC for it.
        </p>
      </div>
    </div>
  )
}
