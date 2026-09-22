import Link from "next/link"
import { BedDouble, ChevronRight } from "lucide-react"

import { BedsIcon, PatientsIcon } from "@/components/badge-icons"
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
import { Pager, parsePage } from "@/components/ui/pager"
import { TabPanel } from "@/components/ui/tab-panel"
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
  admissions: {
    id: string
    admitted_on: string
    wards: { name: string } | null
  }[]
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; show?: string }>
}) {
  const { q = "", page: rawPage, show } = await searchParams
  const filter: PatientFilter = isPatientFilter(show) ? show : "admitted"
  const page = parsePage(rawPage)
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
      { count: "exact" },
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

  const wards: WardOption[] = (wardsResult.data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
  }))
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

        {/* Keyed by the filter, so switching brings the list in as a panel.
            Not keyed on the search term: the box is debounced, and a fade on
            every keystroke would be unreadable. */}
        <TabPanel panelKey={filter} index={filter === "admitted" ? 0 : 1}>
          <div className="flex flex-col gap-4">
            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive"
              >
                Could not load patients: {error.message}
              </p>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
                {filter === "admitted" ? (
                  <BedsIcon className="size-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.15)]" />
                ) : (
                  <PatientsIcon className="size-12 drop-shadow-[0_4px_6px_rgb(0_0_0/0.15)]" />
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
                          className="relative flex flex-col gap-3 rounded-xl surface surface-lift px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2"
                        >
                          {/* A floor on the name block: with fixed-width detail
                              columns and only min-w-0 here, the name was squeezed
                              to two pixels at 1024px. Below that the details wrap
                              onto their own line instead. On a phone it is the
                              full width, less room for the chevron pinned in the
                              corner. */}
                          <div className="flex min-w-0 flex-col gap-0.5 pr-7 sm:min-w-[15rem] sm:flex-1 sm:pr-0">
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
                              row starting wherever the previous one ended. Those
                              widths only apply from sm up: on a phone the same
                              details sit in a two-column grid, where fixed widths
                              made them wrap wherever they happened to fit. */}
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-base sm:flex sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                            <Detail
                              label="MRN"
                              value={patient.mrn}
                              numeric
                              width="sm:w-36"
                            />
                            <Detail
                              label="Age"
                              value={formatAge(patient.date_of_birth)}
                              width="sm:w-24"
                            />
                            <Detail
                              label="Gender"
                              value={patient.gender}
                              capitalize
                              width="sm:w-20"
                            />
                            <Detail
                              label="Phone"
                              value={patient.guardian_phone ?? "—"}
                              numeric
                              width="sm:w-32"
                            />
                            <Detail
                              label="Current bill"
                              value={stay ? formatPKR(runningTotal) : "—"}
                              numeric
                              emphasis={Boolean(stay)}
                              width="sm:w-28"
                              align="right"
                            />
                          </dl>

                          <ChevronRight
                            className="absolute top-4 right-3 size-5 shrink-0 text-muted-foreground sm:static"
                            aria-hidden
                          />
                        </Link>
                      </li>
                    )
                  })}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base text-muted-foreground">
                    {total} {total === 1 ? "patient" : "patients"} · page {page} of{" "}
                    {lastPage}
                  </p>
                  <Pager
                    page={page}
                    lastPage={lastPage}
                    hrefFor={(p) => patientsHref({ query, filter, page: p })}
                  />
                </div>
              </>
            )}
          </div>
        </TabPanel>
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
        align === "right" ? "sm:items-end sm:text-right" : "",
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
/** A /patients URL that keeps the search term and the chosen tab. */
function patientsHref({
  query,
  filter,
  page,
}: {
  query: string
  filter: PatientFilter
  page: number
}): string {
  const params = new URLSearchParams()
  if (query) params.set("q", query)
  params.set("show", filter)
  params.set("page", String(page))
  return `/patients?${params.toString()}`
}
