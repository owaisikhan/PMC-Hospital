import { BedDouble } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import {
  AdmitDialog,
  type PatientOption,
  type RateOption,
  type WardOption,
} from "@/components/wards/admit-dialog"
import { AddSupportButton, DischargeButton } from "@/components/wards/stay-actions"
import { Badge } from "@/components/ui/badge"
import { formatAge, formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export const metadata = { title: "Wards" }

interface ChargeLine {
  service_id: string
  admission_id: string
  charge_name: string
  rate_amount: number | string
  from_date: string
  effective_to: string
  days: number
  line_total: number | string
}

export default async function WardsPage() {
  await requireProfile()
  const supabase = await createClient()

  const [staysResult, wardsResult, ratesResult, patientsResult] = await Promise.all([
    supabase
      .from("admissions")
      .select(
        "id, admitted_on, diagnosis, patients(id, mrn, full_name, date_of_birth), wards(id, name)"
      )
      .is("discharged_on", null)
      .order("admitted_on", { ascending: true }),
    supabase.from("wards").select("id, name").eq("is_active", true).order("sort_order"),
    supabase
      .from("charge_rates")
      .select("id, name, amount")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("patients")
      .select("id, mrn, full_name, date_of_birth, admissions!left(id)")
      .is("admissions.discharged_on", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  const stays = staysResult.data ?? []
  const stayIds = stays.map((s) => s.id)

  // Charge lines for the open stays only, then grouped in memory. The view
  // extends an open-ended service to today, so these totals move on their own
  // as a stay continues.
  const { data: lineRows } = stayIds.length
    ? await supabase
        .from("admission_charge_lines")
        .select("*")
        .in("admission_id", stayIds)
    : { data: [] as ChargeLine[] }

  const linesByStay = new Map<string, ChargeLine[]>()
  for (const line of (lineRows ?? []) as ChargeLine[]) {
    const list = linesByStay.get(line.admission_id) ?? []
    list.push(line)
    linesByStay.set(line.admission_id, list)
  }

  const wards: WardOption[] = (wardsResult.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
  }))
  const rates: RateOption[] = (ratesResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
  }))
  const patients: PatientOption[] = (
    (patientsResult.data ?? []) as unknown as {
      id: string
      mrn: string
      full_name: string
      date_of_birth: string
      admissions: { id: string }[]
    }[]
  ).map((p) => ({
    id: p.id,
    mrn: p.mrn,
    fullName: p.full_name,
    dateOfBirth: p.date_of_birth,
    isAdmitted: p.admissions.length > 0,
  }))

  return (
    <>
      <PageHeader
        title="Wards"
        description="Every child currently in the hospital."
        actions={<AdmitDialog patients={patients} wards={wards} rates={rates} />}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {stays.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <BedDouble className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">Nobody is admitted right now.</p>
            <p className="text-base text-muted-foreground">
              Use “Admit patient” above when a child is admitted.
            </p>
          </div>
        ) : (
          stays.map((stay) => {
            const patient = stay.patients as unknown as {
              id: string
              mrn: string
              full_name: string
              date_of_birth: string
            }
            const ward = stay.wards as unknown as { id: string; name: string }
            const lines = linesByStay.get(stay.id) ?? []
            const total = lines.reduce((sum, l) => sum + Number(l.line_total), 0)

            return (
              <article
                key={stay.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {patient.full_name}
                      </h2>
                      <Badge variant="info" className="text-sm">
                        {ward.name}
                      </Badge>
                    </div>
                    <p className="text-base text-muted-foreground">
                      <span className="tabular-nums">{patient.mrn}</span> ·{" "}
                      {formatAge(patient.date_of_birth)} · admitted{" "}
                      <span className="tabular-nums">{stay.admitted_on}</span>
                      {stay.diagnosis ? ` · ${stay.diagnosis}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm text-muted-foreground">Charges so far</span>
                    <span className="text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums">
                      {formatPKR(total)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-base">
                    <caption className="sr-only">
                      Charges for {patient.full_name}
                    </caption>
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Charge
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Dates
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">
                          Days
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">
                          Rate a day
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.service_id} className="border-b border-border/60">
                          <td className="py-2.5 pr-4">{line.charge_name}</td>
                          <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">
                            {line.from_date} → {line.effective_to}
                          </td>
                          <td className="py-2.5 pr-4 text-right tabular-nums">
                            {line.days}
                          </td>
                          <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums">
                            {formatPKR(Number(line.rate_amount))}
                          </td>
                          <td className="py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
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

                <div className="flex flex-wrap gap-2">
                  <AddSupportButton
                    admissionId={stay.id}
                    admittedOn={stay.admitted_on}
                    rates={rates}
                  />
                  <DischargeButton
                    admissionId={stay.id}
                    patientName={patient.full_name}
                    admittedOn={stay.admitted_on}
                    runningTotal={total}
                  />
                </div>
              </article>
            )
          })
        )}
      </div>
    </>
  )
}
