import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import type { RateOption } from "@/components/patients/admit-dialog"
import { StayCard, type ChargeLine, type Stay } from "@/components/patients/stay-card"
import { formatAge } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

interface PatientRecord {
  id: string
  mrn: string
  full_name: string
  father_name: string | null
  date_of_birth: string
  gender: string
  guardian_phone: string | null
  address: string | null
  admissions: {
    id: string
    admitted_on: string
    discharged_on: string | null
    status: string
    diagnosis: string | null
    wards: { name: string } | null
  }[]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from("patients")
    .select("full_name")
    .eq("id", id)
    .maybeSingle()
  return { title: data?.full_name ?? "Patient" }
}

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  await requireProfile()
  const supabase = await createClient()

  const { data } = await supabase
    .from("patients")
    .select(
      `id, mrn, full_name, father_name, date_of_birth, gender, guardian_phone, address,
       admissions(id, admitted_on, discharged_on, status, diagnosis, wards(name))`
    )
    .eq("id", id)
    .maybeSingle()

  if (!data) notFound()
  const patient = data as unknown as PatientRecord

  const stayIds = patient.admissions.map((a) => a.id)
  const { data: lineRows } = stayIds.length
    ? await supabase.from("admission_charge_lines").select("*").in("admission_id", stayIds)
    : { data: [] as ChargeLine[] }

  const linesByStay = new Map<string, ChargeLine[]>()
  for (const line of (lineRows ?? []) as ChargeLine[]) {
    const list = linesByStay.get(line.admission_id) ?? []
    list.push(line)
    linesByStay.set(line.admission_id, list)
  }

  const { data: rateRows } = await supabase
    .from("charge_rates")
    .select("id, name, amount")
    .eq("is_active", true)
    .order("sort_order")
  const rates: RateOption[] = (rateRows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
  }))

  // Newest stay first, so the one being worked on is at the top.
  const stays = [...patient.admissions].sort((a, b) =>
    b.admitted_on.localeCompare(a.admitted_on)
  )

  // `capitalize` is per-field: applied to everything it turns "18 months" into
  // "18 Months", and would mangle an address.
  const details: { label: string; value: string; capitalize?: boolean }[] = [
    { label: "MRN", value: patient.mrn },
    { label: "Age", value: formatAge(patient.date_of_birth) },
    { label: "Date of birth", value: patient.date_of_birth },
    { label: "Gender", value: patient.gender, capitalize: true },
    { label: "Father", value: patient.father_name ?? "—" },
    { label: "Guardian's phone", value: patient.guardian_phone ?? "—" },
    { label: "Address", value: patient.address ?? "—" },
  ]

  return (
    <>
      <PageHeader
        title={patient.full_name}
        description={`${patient.mrn} · ${formatAge(patient.date_of_birth)}`}
        actions={
          <Link
            href="/patients"
            className="flex h-11 items-center gap-2 rounded-lg border border-border px-4 text-base font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4.5" aria-hidden />
            All patients
          </Link>
        }
      />

      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        <section className="rounded-xl surface p-4 sm:p-5">
          <h2 className="mb-3 text-base font-semibold tracking-tight">Details</h2>
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {details.map((detail) => (
              <div key={detail.label} className="flex flex-col gap-0.5">
                <dt className="text-sm text-muted-foreground">{detail.label}</dt>
                <dd
                  className={`text-base font-medium break-words tabular-nums${
                    detail.capitalize ? " capitalize" : ""
                  }`}
                >
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold tracking-tight">
            Stays {stays.length > 0 ? `(${stays.length})` : ""}
          </h2>

          {stays.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-base text-muted-foreground">
              This patient has never been admitted. Use “Admit patient” on the
              Patients page.
            </p>
          ) : (
            stays.map((admission) => {
              const stay: Stay = {
                id: admission.id,
                admittedOn: admission.admitted_on,
                dischargedOn: admission.discharged_on,
                status: admission.status,
                diagnosis: admission.diagnosis,
                wardName: admission.wards?.name ?? "Ward",
                patientName: patient.full_name,
              }
              return (
                <StayCard
                  key={admission.id}
                  stay={stay}
                  lines={linesByStay.get(admission.id) ?? []}
                  rates={rates}
                />
              )
            })
          )}
        </section>
      </div>
    </>
  )
}
