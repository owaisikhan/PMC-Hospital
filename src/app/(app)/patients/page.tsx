import { BedDouble, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { PatientSearch } from "@/components/patients/patient-search"
import { RegisterPatientDialog } from "@/components/patients/register-patient-dialog"
import { Badge } from "@/components/ui/badge"
import { formatAge } from "@/lib/format"
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
  admissions: { id: string }[]
}

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q = "", page: rawPage } = await searchParams
  // Validated against the allowed shape, never Number(param) || 1, so a
  // hand-edited URL cannot ask the database for an enormous offset.
  const page = Math.max(1, Math.min(9999, Number.parseInt(rawPage ?? "1", 10) || 1))
  const query = q.trim()

  await requireProfile()
  const supabase = await createClient()

  let request = supabase
    .from("patients")
    .select(
      "id, mrn, full_name, father_name, date_of_birth, gender, guardian_phone, admissions!left(id)",
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

  return (
    <>
      <PageHeader
        title="Patients"
        description="Every child registered at PMC."
        actions={<RegisterPatientDialog />}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <PatientSearch initialQuery={query} />

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/12 px-3 py-2.5 text-base text-destructive">
            Could not load patients: {error.message}
          </p>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Users className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">
              {query ? "No child matches that search." : "No children registered yet."}
            </p>
            <p className="text-base text-muted-foreground">
              {query
                ? "Check the spelling, or search by medical record number."
                : "Use “Register patient” above to add the first one."}
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {patients.map((patient) => {
                const isAdmitted = patient.admissions.length > 0
                return (
                  <li
                    key={patient.id}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-card px-4 py-3.5"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-lg font-semibold tracking-tight">
                          {patient.full_name}
                        </span>
                        {isAdmitted ? (
                          <Badge variant="success" className="text-sm">
                            <BedDouble className="size-3.5" aria-hidden />
                            Admitted
                          </Badge>
                        ) : null}
                      </div>
                      {patient.father_name ? (
                        <span className="text-base text-muted-foreground">
                          Father: {patient.father_name}
                        </span>
                      ) : null}
                    </div>

                    <dl className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-base">
                      <div className="flex flex-col">
                        <dt className="text-sm text-muted-foreground">MRN</dt>
                        <dd className="font-medium whitespace-nowrap tabular-nums">
                          {patient.mrn}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm text-muted-foreground">Age</dt>
                        <dd className="font-medium whitespace-nowrap">
                          {formatAge(patient.date_of_birth)}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm text-muted-foreground">Gender</dt>
                        <dd className="font-medium capitalize">{patient.gender}</dd>
                      </div>
                      {patient.guardian_phone ? (
                        <div className="flex flex-col">
                          <dt className="text-sm text-muted-foreground">Phone</dt>
                          <dd className="font-medium whitespace-nowrap tabular-nums">
                            {patient.guardian_phone}
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                )
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base text-muted-foreground">
                {total} {total === 1 ? "child" : "children"}
                {query ? " matching" : " registered"} · page {page} of {lastPage}
              </p>
              <Pager page={page} lastPage={lastPage} query={query} />
            </div>
          </>
        )}
      </div>
    </>
  )
}

/** A dead pager control is a span, not a link styled to look disabled — a
 *  disabled-looking link still takes focus and still navigates. */
function Pager({
  page,
  lastPage,
  query,
}: {
  page: number
  lastPage: number
  query: string
}) {
  if (lastPage <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    params.set("page", String(p))
    return `/patients?${params.toString()}`
  }

  const base =
    "flex h-11 items-center rounded-lg border border-border px-4 text-base font-medium"

  return (
    <div className="flex gap-2">
      {page > 1 ? (
        <a href={href(page - 1)} className={`${base} transition-colors hover:bg-muted`}>
          Previous
        </a>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Previous</span>
      )}
      {page < lastPage ? (
        <a href={href(page + 1)} className={`${base} transition-colors hover:bg-muted`}>
          Next
        </a>
      ) : (
        <span className={`${base} text-muted-foreground opacity-50`}>Next</span>
      )}
    </div>
  )
}
