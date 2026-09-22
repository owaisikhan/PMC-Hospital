import { Badge } from "@/components/ui/badge"
import { AddSupportButton, DischargeButton } from "@/components/patients/stay-actions"
import type { RateOption } from "@/components/patients/admit-dialog"
import { formatPKR } from "@/lib/format"

export interface ChargeLine {
  service_id: string
  admission_id: string
  charge_name: string
  rate_amount: number | string
  from_date: string
  effective_to: string
  days: number
  line_total: number | string
}

export interface Stay {
  id: string
  admittedOn: string
  dischargedOn: string | null
  status: string
  diagnosis: string | null
  wardName: string
  patientName: string
}

const OUTCOME_LABELS: Record<string, string> = {
  admitted: "Admitted",
  discharged: "Discharged home",
  referred: "Referred elsewhere",
  lama: "Left against medical advice",
  expired: "Died",
}

/**
 * One stay with its itemised bill. While the stay is open the charge-line view
 * extends an open-ended service to today, so the total climbs on its own — the
 * figures are never typed in and never stored stale.
 */
export function StayCard({
  stay,
  lines,
  rates,
}: {
  stay: Stay
  lines: ChargeLine[]
  rates: RateOption[]
}) {
  const total = lines.reduce((sum, l) => sum + Number(l.line_total), 0)
  const isOpen = stay.dischargedOn === null

  return (
    <article className="flex flex-col gap-4 rounded-xl surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-lg font-semibold tracking-tight">{stay.wardName}</h3>
            <Badge variant={isOpen ? "success" : "neutral"} className="text-sm">
              {OUTCOME_LABELS[stay.status] ?? stay.status}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground">
            <span className="tabular-nums">{stay.admittedOn}</span>
            {stay.dischargedOn ? (
              <>
                {" → "}
                <span className="tabular-nums">{stay.dischargedOn}</span>
              </>
            ) : (
              " → still admitted"
            )}
            {stay.diagnosis ? ` · ${stay.diagnosis}` : ""}
          </p>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-sm text-muted-foreground">
            {isOpen ? "Current bill" : "Final bill"}
          </span>
          <span className="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
            {formatPKR(total)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="stack-table w-full md:min-w-[34rem] border-collapse text-base">
          <caption className="sr-only">
            Charges for the stay starting {stay.admittedOn}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2 pr-4 font-medium">Charge</th>
              <th scope="col" className="py-2 pr-4 font-medium">Dates</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Days</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Rate a day</th>
              <th scope="col" className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.service_id} className="border-b border-border/60">
                <td data-cell="primary" className="py-2.5 pr-4">{line.charge_name}</td>
                <td data-label="Dates" className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                  {line.from_date} → {line.effective_to}
                </td>
                <td data-label="Days" className="py-2.5 pr-4 text-right tabular-nums">{line.days}</td>
                <td data-label="Rate a day" className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums">
                  {formatPKR(Number(line.rate_amount))}
                </td>
                <td data-label="Amount" className="py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
                  {formatPKR(Number(line.line_total))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4} className="py-2.5 pr-4 text-right font-medium">
                Total
              </th>
              <td className="py-2.5 text-right text-lg font-semibold whitespace-nowrap tabular-nums">
                {formatPKR(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {isOpen ? (
        <div className="flex flex-wrap gap-2">
          <AddSupportButton
            admissionId={stay.id}
            admittedOn={stay.admittedOn}
            rates={rates}
          />
          <DischargeButton
            admissionId={stay.id}
            patientName={stay.patientName}
            admittedOn={stay.admittedOn}
            runningTotal={total}
          />
        </div>
      ) : null}
    </article>
  )
}
