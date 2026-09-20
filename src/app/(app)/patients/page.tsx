import Link from "next/link"
import { BedDouble, ChevronRight, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import {
  AdmitDialog,
  type PatientOption,
  type RateOption,
  type WardOption,
} from "@/components/patients/admit-dialog"
import { PatientSearch } from "@/components/patients/patient-search"
import { RegisterPatientDialog } from "@/components/patients/register-patient-dialog"
import {
  StatusFilter,
  isPatientFilter,
  type PatientFilter,
} from "@/components/patients/status-filter"
import { Badge } from "@/components/ui/badge"
import { formatAge, formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export const metadata = { title: "Patients" }

const PAGE_SIZE = 20

interface PatientRow {
  id: string
  mrn: string
  full_name: string
  father_name: string | null
  date_of_birth: string
  gender: string
  guardian_phone: string | null
  admissions: { id: string; admitted_on: string; wards: { name: string } | null }[]
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; show?: string }>
}) {
  const { q = "", page: rawPage, show } = await searchParams
  const filter: PatientFilter = isPatientFilter(show) ? show : "admitted"
  const page = Math.max(1, Math.min(9999, Number.parseInt(rawPage ?? "1", 10) || 1))
  const query = q.trim()

  await requireProfile()
  const supabase = await createClient()

  // `admissions!inner` when filtering to admitted, so the join narrows the
  // patient list rather than just decorating it.
  const join = filter === "admitted" ? "admissions!inner" : "admissions!left"

  let request = supabase
    .from("patients")
    .select(
      `id, mrn, full_name, father_name, date_of_birth, gender, guardian_phone,
       ${join}(id, admitted_on, wards(name))`,
      { count: "exact" }
    )
    .is("admissions.discharged_on", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (query) {
    const safe = query.replace(/[%,()]/g, " ")
    request = request.or(`full_name.ilike.%${safe}%,mrn.ilike.%${safe}%`)
  }

  const { data, count, error } = await request
  const patients = (data ?? []) as unknown as PatientRow[]
  const total = count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Running totals for the stays on this page only.
  const openStayIds = patients.flatMap((p) => p.admissions.map((a) => a.id))
  const totalsByStay = new Map<string, number>()
  if (openStayIds.length > 0) {
    const { data: lines } = await supabase
      .from("admission_charge_lines")
      .select("admission_id, line_total")
      .in("admission_id", openStayIds)
    for (const line of lines ?? []) {
      const current = totalsByStay.get(line.admission_id) ?? 0
      totalsByStay.set(line.admission_id, current + Number(line.line_total))
    }
  }

  const [wardsResult, ratesResult, allPatientsResult] = await Promise.all([
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

  const wards: WardOption[] = (wardsResult.data ?? []).map((w) => ({ id: w.id, name: w.name }))
  const rates: RateOption[] = (ratesResult.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
  }))
  const options: PatientOption[] = (
    (allPatientsResult.data ?? []) as unknown as {
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
        title="Patients"
        description="Every patient registered at PMC, and who is admitted right now."
        actions={
          <div className="flex flex-wrap gap-2">
            <RegisterPatientDialog />
            <AdmitDialog patients={options} wards={wards} rates={rates} />
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusFilter active={filter} query={query} />
          <PatientSearch initialQuery={query} filter={filter} />
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive">
            Could not load patients: {error.message}
          </p>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            {filter === "admitted" ? (
              <BedDouble className="size-8 text-muted-foreground" aria-hidden />
            ) : (
              <Users className="size-8 text-muted-foreground" aria-hidden />
            )}
            <p className="text-base font-medium">
              {query
                ? "No patient matches that search."
                : filter === "admitted"
                  ? "Nobody is admitted right now."
                  : "No patients registered yet."}
            </p>
            <p className="text-base text-muted-foreground">
              {query
                ? "Check the spelling, or try “All patients”."
                : filter === "admitted"
                  ? "Use “Admit patient” above when a patient is admitted."
                  : "Use “Register patient” above to add the first one."}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {patients.map((patient) => {
                const stay = patient.admissions[0]
                const runningTotal = stay ? (totalsByStay.get(stay.id) ?? 0) : 0

                return (
                  <li key={patient.id}>
                    <Link
                      href={`/patients/${patient.id}`}
                      className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      {/* A floor on the name block: with fixed-width detail
                          columns and only min-w-0 here, the name was squeezed
                          to two pixels at 1024px. Below that the details wrap
                          onto their own line instead. */}
                      <div className="flex min-w-[15rem] flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-lg font-semibold tracking-tight">
                            {patient.full_name}
                          </span>
                          {stay ? (
                            <Badge variant="success" className="text-sm">
                              <BedDouble className="size-3.5" aria-hidden />
                              {stay.wards?.name ?? "Admitted"}
                            </Badge>
                          ) : null}
                        </div>
                        {patient.father_name ? (
                          <span className="text-base text-muted-foreground">
                            Father: {patient.father_name}
                          </span>
                        ) : null}
                      </div>

                      {/* Fixed column widths, and every cell always rendered,
                          so the columns line up down the list instead of each
                          row starting wherever the previous one ended. */}
                      <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base">
                        <Detail label="MRN" value={patient.mrn} numeric width="w-36" />
                        <Detail
                          label="Age"
                          value={formatAge(patient.date_of_birth)}
                          width="w-24"
                        />
                        <Detail
                          label="Gender"
                          value={patient.gender}
                          capitalize
                          width="w-20"
                        />
                        <Detail
                          label="Phone"
                          value={patient.guardian_phone ?? "—"}
                          numeric
                          width="w-32"
                        />
                        <Detail
                          label="Current bill"
                          value={stay ? formatPKR(runningTotal) : "—"}
                          numeric
                          emphasis={Boolean(stay)}
                          width="w-28"
                          align="right"
                        />
                      </dl>

                      <ChevronRight
                        className="size-5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base text-muted-foreground">
                {total} {total === 1 ? "patient" : "patients"} · page {page} of {lastPage}
              </p>
              <Pager page={page} lastPage={lastPage} query={query} filter={filter} />
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** One cell of the patient row. Kept as a component so every column shares the
 *  same label size, weight and alignment rather than drifting apart. */
function Detail({
  label,
  value,
  numeric,
  capitalize,
  emphasis,
  width,
  align = "left",
}: {
  label: string
  value: string
  /** Tabular figures, so MRNs, phone numbers and money line up. */
  numeric?: boolean
  capitalize?: boolean
  emphasis?: boolean
  /** Fixed width keeps the column aligned across rows. */
  width?: string
  align?: "left" | "right"
}) {
  return (
    <div
      className={[
        "flex flex-col",
        width ?? "",
        align === "right" ? "items-end text-right" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={[
          "whitespace-nowrap",
          emphasis ? "font-semibold" : "font-medium",
          numeric ? "tabular-nums" : "",
          capitalize ? "capitalize" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  )
}

/** A dead pager control is a span: a disabled-looking link still takes focus
 *  and still navigates. */
function Pager({
  page,
  lastPage,
  query,
  filter,
}: {
  page: number
  lastPage: number
  query: string
  filter: PatientFilter
}) {
  if (lastPage <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    params.set("show", filter)
    params.set("page", String(p))
    return `/patients?${params.toString()}`
  }

  const base =
    "flex h-11 items-center rounded-lg border border-border px-4 text-base font-medium"

  return (
    <div className="flex gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${base} transition-colors hover:bg-muted`}>
          Previous
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Previous</span>
      )}
      {page < lastPage ? (
        <Link href={href(page + 1)} className={`${base} transition-colors hover:bg-muted`}>
          Next
        </Link>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Next</span>
      )}
    </div>
  )
}
